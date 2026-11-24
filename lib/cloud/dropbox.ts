"use client";

import { loadScript, type OnProgress, readCloud, writeCloud } from "./store";

// C1: Dropbox from the browser. "App folder" app: saving goes to Dropbox/Apps/TeachingTime
// (OAuth with PKCE, no secret; the refresh token stays in this browser). Picking files uses
// Dropbox's Chooser, which needs no connection at all.
const APP_KEY = () => process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? "";
const API = "https://api.dropboxapi.com";
const CONTENT = "https://content.dropboxapi.com/2/files";
const PKCE_KEY = "tt-dropbox-pkce";
const TOKEN_KEY = "tt-dropbox-token";
const CHUNK = 8 * 1024 * 1024;

const redirectUri = () => `${window.location.origin}/cloud/dropbox`;
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Settings → Connect: off to Dropbox, back on /cloud/dropbox.
export async function startDropboxConnect(returnTo: string) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo }));
  const q = new URLSearchParams({
    client_id: APP_KEY(),
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    token_access_type: "offline",
    redirect_uri: redirectUri(),
    state,
  });
  window.location.assign(`https://www.dropbox.com/oauth2/authorize?${q}`);
}

// /cloud/dropbox: the code for tokens. Returns where to go back to.
export async function finishDropboxConnect(code: string, state: string): Promise<string> {
  const saved = JSON.parse(sessionStorage.getItem(PKCE_KEY) ?? "null");
  sessionStorage.removeItem(PKCE_KEY);
  if (!saved || saved.state !== state) throw new Error("state");
  const r = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
      client_id: APP_KEY(),
      redirect_uri: redirectUri(),
    }),
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const t = await r.json();
  keepToken(t.access_token, t.expires_in);
  let email: string | undefined;
  try {
    const me = await fetch(`${API}/2/users/get_current_account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    if (me.ok) email = (await me.json()).email;
  } catch {}
  writeCloud({ dropbox: { refresh: t.refresh_token, email } });
  return typeof saved.returnTo === "string" && saved.returnTo.startsWith("/") ? saved.returnTo : "/dashboard/settings";
}

function keepToken(token: string, seconds: number) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expires: Date.now() + (seconds - 120) * 1000 }));
}

async function dropboxToken(): Promise<string> {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? "null");
    if (t && t.expires > Date.now()) return t.token;
  } catch {}
  const refresh = readCloud().dropbox?.refresh;
  if (!refresh) throw new Error("not connected");
  const r = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: APP_KEY() }),
  });
  if (r.status === 400 || r.status === 401) writeCloud({ dropbox: null }); // revoked in Dropbox
  if (!r.ok) throw new Error(`refresh ${r.status}`);
  const t = await r.json();
  keepToken(t.access_token, t.expires_in);
  return t.access_token;
}

export async function disconnectDropbox() {
  const token = await dropboxToken().catch(() => null);
  sessionStorage.removeItem(TOKEN_KEY);
  writeCloud({ dropbox: null });
  if (token) await fetch(`${API}/2/auth/token/revoke`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

// Dropbox-API-Arg is a header: only ASCII, so other characters as \uXXXX.
const arg = (o: unknown) => JSON.stringify(o).replace(/[\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

// Saves into Apps/TeachingTime/Recordings, in 8 MB pieces (an upload session).
export async function saveToDropbox(file: File, onProgress?: OnProgress): Promise<string> {
  const token = await dropboxToken();
  const call = async (path: string, args: unknown, body: Blob) => {
    const r = await fetch(`${CONTENT}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream", "Dropbox-API-Arg": arg(args) },
      body,
    });
    if (!r.ok) throw new Error(`Dropbox ${path} ${r.status}`);
    return r.json();
  };
  const first = file.slice(0, CHUNK);
  const { session_id } = await call("upload_session/start", { close: false }, first);
  let offset = first.size;
  onProgress?.(offset / Math.max(1, file.size));
  while (offset < file.size) {
    const piece = file.slice(offset, offset + CHUNK);
    await call("upload_session/append_v2", { cursor: { session_id, offset }, close: false }, piece);
    offset += piece.size;
    onProgress?.(offset / file.size);
  }
  const done = await call(
    "upload_session/finish",
    { cursor: { session_id, offset }, commit: { path: `/Recordings/${file.name}`, mode: "add", autorename: true } },
    new Blob([]),
  );
  return `Apps/TeachingTime${done.path_display ?? `/Recordings/${file.name}`}`;
}

type ChooserFile = { link: string; name: string; bytes: number };
type DropboxGlobal = {
  choose: (o: {
    success: (files: ChooserFile[]) => void;
    cancel?: () => void;
    linkType: "direct" | "preview";
    multiselect: boolean;
    extensions?: string[];
    sizeLimit?: number;
    folderselect?: boolean;
  }) => void;
};

// Dropbox's Chooser (its own window): the chosen files' contents.
export async function pickFromDropbox(extensions: string[], sizeLimit: number): Promise<File[]> {
  const w = window as unknown as { Dropbox?: DropboxGlobal };
  if (!w.Dropbox) {
    await loadScript("https://www.dropbox.com/static/api/2/dropins.js", { id: "dropboxjs", "data-app-key": APP_KEY() });
  }
  const chosen = await new Promise<ChooserFile[]>((resolve) =>
    w.Dropbox!.choose({ success: resolve, cancel: () => resolve([]), linkType: "direct", multiselect: true, extensions, sizeLimit }),
  );
  return Promise.all(
    chosen.map(async (f) => {
      const r = await fetch(f.link);
      if (!r.ok) throw new Error(`Dropbox ${r.status}`);
      const blob = await r.blob();
      return new File([blob], f.name, { type: blob.type });
    }),
  );
}
