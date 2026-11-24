"use client";

import { useSyncExternalStore } from "react";

// C1: the teacher's clouds, kept in this browser only (localStorage): TeachingTime's servers
// never see a cloud token. Google gives short-lived tokens (kept for the tab, sessionStorage);
// Dropbox a refresh token (kept here until she disconnects).

export type SaveTo = "download" | "google" | "dropbox";
export type CloudState = {
  google: { email?: string } | null; // connected (a token is asked for when needed)
  dropbox: { email?: string; refresh: string } | null;
  saveTo: SaveTo; // where a finished recording goes
};

const KEY = "tt-cloud";
const EMPTY: CloudState = { google: null, dropbox: null, saveTo: "download" };
let cached: { raw: string | null; state: CloudState } | null = null;
const listeners = new Set<() => void>();

export function readCloud(): CloudState {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(KEY);
  if (cached && cached.raw === raw) return cached.state;
  let state = EMPTY;
  try {
    const r = raw ? JSON.parse(raw) : {};
    state = {
      google: r.google && typeof r.google === "object" ? { email: str(r.google.email) } : null,
      dropbox:
        r.dropbox && typeof r.dropbox.refresh === "string"
          ? { email: str(r.dropbox.email), refresh: r.dropbox.refresh }
          : null,
      saveTo: r.saveTo === "google" || r.saveTo === "dropbox" ? r.saveTo : "download",
    };
  } catch {}
  cached = { raw, state };
  return state;
}
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : undefined);

export function writeCloud(change: Partial<CloudState>) {
  const next = { ...readCloud(), ...change };
  // A cloud that's gone can't be where recordings go.
  if ((next.saveTo === "google" && !next.google) || (next.saveTo === "dropbox" && !next.dropbox)) next.saveTo = "download";
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    readCloud,
    () => EMPTY,
  );
}

export const GOOGLE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY &&
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_GOOGLE_APP_ID
);
export const DROPBOX_CONFIGURED = !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;

export function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded) return resolve();
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => {
      s.dataset.loaded = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(`Could not load ${src}`)));
    if (!existing) {
      s.src = src;
      s.async = true;
      for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
      document.head.appendChild(s);
    }
  });
}

// Upload progress: 0..1.
export type OnProgress = (share: number) => void;
