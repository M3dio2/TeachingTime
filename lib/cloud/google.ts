"use client";

import { loadScript, type OnProgress, readCloud, writeCloud } from "./store";

// C1: Google Drive from the browser. Scope drive.file: TeachingTime sees only the files the
// teacher picks in Google's picker or that it saved itself (no Google review needed).
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "TeachingTime recordings";
const TOKEN_KEY = "tt-google-token";
const FOLDER_KEY = "tt-google-folder";

/* Google's scripts have no types here: the few parts used. */
type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
type GoogleGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (c: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type: string }) => void;
      }) => { requestAccessToken: (o?: { prompt?: string }) => void };
      revoke: (token: string, done?: () => void) => void;
    };
  };
  picker: {
    DocsView: new (viewId?: string) => PickerView;
    ViewId: { DOCS: string };
    PickerBuilder: new () => PickerBuilder;
    Feature: { MULTISELECT_ENABLED: string; SUPPORT_DRIVES: string };
    Action: { PICKED: string; CANCEL: string };
  };
};
type PickerView = {
  setMimeTypes: (t: string) => PickerView;
  setIncludeFolders: (b: boolean) => PickerView;
  setSelectFolderEnabled: (b: boolean) => PickerView;
};
type PickerBuilder = {
  addView: (v: PickerView) => PickerBuilder;
  enableFeature: (f: string) => PickerBuilder;
  setOAuthToken: (t: string) => PickerBuilder;
  setDeveloperKey: (k: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setLocale: (l: string) => PickerBuilder;
  setOrigin: (o: string) => PickerBuilder;
  setCallback: (cb: (d: PickerData) => void) => PickerBuilder;
  build: () => { setVisible: (b: boolean) => void };
};
type PickerData = { action: string; docs?: { id: string; name: string; mimeType: string; sizeBytes?: number }[] };
type Gapi = { load: (lib: string, cb: () => void) => void };
const g = () => (window as unknown as { google: GoogleGlobal }).google;

const env = () => ({
  key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "",
  client: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  app: process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "",
});

// A token still valid for 2 minutes or more, if this tab has one.
export function cachedGoogleToken(): string | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? "null");
    if (t && typeof t.token === "string" && t.expires > Date.now() + 120_000) return t.token;
  } catch {}
  return null;
}

// Must run in a click (Google opens a small window). Silent when she agreed before.
export async function googleToken(): Promise<string> {
  const cached = cachedGoogleToken();
  if (cached) return cached;
  await loadScript("https://accounts.google.com/gsi/client");
  const token = await new Promise<string>((resolve, reject) => {
    const client = g().accounts.oauth2.initTokenClient({
      client_id: env().client,
      scope: SCOPE,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? "no token"))),
      error_callback: (e) => reject(new Error(e.type)),
    });
    client.requestAccessToken({ prompt: readCloud().google ? "" : "consent" });
  });
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expires: Date.now() + 55 * 60_000 }));
  return token;
}

// Connect (Settings): a token, then the account's address for "Connected as …".
export async function connectGoogle() {
  const token = await googleToken();
  let email: string | undefined;
  try {
    const r = await fetch(`${API}/about?fields=user(emailAddress)`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) email = (await r.json()).user?.emailAddress;
  } catch {}
  writeCloud({ google: { email } });
}

export async function disconnectGoogle() {
  const token = cachedGoogleToken();
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FOLDER_KEY);
  writeCloud({ google: null });
  if (token) {
    await loadScript("https://accounts.google.com/gsi/client").catch(() => {});
    g()?.accounts?.oauth2.revoke(token);
  }
}

// Google's picker: returns the chosen files' contents (only the given types).
export async function pickFromDrive(mimeTypes: string[], locale: string): Promise<File[]> {
  const token = await googleToken();
  if (!readCloud().google) void connectGoogle().catch(() => {});
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((r) => (window as unknown as { gapi: Gapi }).gapi.load("picker", r));
  const { picker } = g();
  const docs = await new Promise<NonNullable<PickerData["docs"]>>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes(mimeTypes.join(","))
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    new picker.PickerBuilder()
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(picker.Feature.SUPPORT_DRIVES)
      .setOAuthToken(token)
      .setDeveloperKey(env().key)
      .setAppId(env().app)
      .setLocale(locale)
      .setOrigin(window.location.origin)
      .setCallback((d) => {
        if (d.action === picker.Action.PICKED) resolve(d.docs ?? []);
        else if (d.action === picker.Action.CANCEL) resolve([]);
      })
      .build()
      .setVisible(true);
  });
  return Promise.all(
    docs.map(async (d) => {
      const r = await fetch(`${API}/files/${encodeURIComponent(d.id)}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Drive ${r.status}`);
      return new File([await r.blob()], d.name, { type: d.mimeType });
    }),
  );
}

async function recordingsFolder(token: string): Promise<string> {
  const known = localStorage.getItem(FOLDER_KEY);
  const auth = { Authorization: `Bearer ${token}` };
  if (known) {
    const r = await fetch(`${API}/files/${known}?fields=id,trashed`, { headers: auth });
    if (r.ok && !(await r.json()).trashed) return known;
  }
  const q = encodeURIComponent(`name = '${FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const found = await fetch(`${API}/files?q=${q}&fields=files(id)`, { headers: auth });
  let id: string | undefined = found.ok ? (await found.json()).files?.[0]?.id : undefined;
  if (!id) {
    const made = await fetch(`${API}/files?fields=id`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: FOLDER, mimeType: "application/vnd.google-apps.folder" }),
    });
    if (!made.ok) throw new Error(`Drive folder ${made.status}`);
    id = (await made.json()).id as string;
  }
  localStorage.setItem(FOLDER_KEY, id);
  return id;
}

// Saves a file into "TeachingTime recordings" (a resumable upload: big files are fine).
export async function saveToDrive(file: File, token: string, onProgress?: OnProgress): Promise<string> {
  const folder = await recordingsFolder(token);
  const start = await fetch(`${UPLOAD}?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.type || "application/octet-stream",
      "X-Upload-Content-Length": String(file.size),
    },
    body: JSON.stringify({ name: file.name, parents: [folder] }),
  });
  const session = start.headers.get("Location");
  if (!start.ok || !session) throw new Error(`Drive upload ${start.status}`);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", session);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Drive upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Drive upload failed"));
    xhr.send(file);
  });
  return `${FOLDER}/${file.name}`;
}
