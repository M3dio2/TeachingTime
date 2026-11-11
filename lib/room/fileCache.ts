"use client";

import { useEffect, useState } from "react";
import { type FileTab, isFileTab, resourceIdOf, type TabId } from "./tabs";

// Classroom files shown in tabs (L2a). /api/resource-url hands out a URL valid for 5 minutes,
// so each file is downloaded once and kept for the session: PDFs as bytes, pictures as an
// object URL. Re-opening a tab later never needs the (expired) URL again.
export type FileKind = "pdf" | "image" | "audio" | "doc";
export type LoadedFile = { name: string; kind: FileKind; bytes?: ArrayBuffer; src?: string };

const files = new Map<string, Promise<LoadedFile>>();
const infos = new Map<string, Promise<{ name: string; kind: FileKind; url: string }>>();

function info(slug: string, resourceId: string) {
  const key = `${slug}/${resourceId}`;
  let p = infos.get(key);
  if (!p) {
    p = fetch("/api/resource-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, id: resourceId }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("not found");
      return res.json();
    });
    p.catch(() => infos.delete(key)); // try again next time
    infos.set(key, p);
  }
  return p;
}

// By resource id: PDFs and Word files as bytes, pictures and audio as object URLs.
export function loadResource(slug: string, resourceId: string): Promise<LoadedFile> {
  const key = `${slug}/${resourceId}`;
  let p = files.get(key);
  if (!p) {
    p = info(slug, resourceId).then(async ({ name, kind, url }) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("download failed");
      if (kind === "pdf" || kind === "doc") return { name, kind, bytes: await res.arrayBuffer() };
      return { name, kind, src: URL.createObjectURL(await res.blob()) };
    });
    p.catch(() => files.delete(key));
    files.set(key, p);
  }
  return p;
}

export const loadFile = (slug: string, id: FileTab) => loadResource(slug, resourceIdOf(id));

export function useLoadedFile(slug: string | undefined, id: FileTab) {
  const [state, setState] = useState<{ id: string; file?: LoadedFile; failed?: boolean }>({ id });
  useEffect(() => {
    if (!slug) return;
    let live = true;
    loadFile(slug, id).then(
      (file) => live && setState({ id, file }),
      () => live && setState({ id, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [slug, id]);
  return state.id === id ? state : { id };
}

// Student: the names of the teacher's file tabs, for the tab labels.
export function useFileNames(slug: string | undefined, tabs: TabId[], known?: Record<string, string>) {
  const [names, setNames] = useState<Record<string, string>>({});
  const missing = tabs.filter((t) => isFileTab(t) && !known?.[t] && !names[t]).join(",");
  useEffect(() => {
    if (!slug || !missing) return;
    for (const id of missing.split(",") as FileTab[]) {
      info(slug, resourceIdOf(id)).then(
        ({ name }) => setNames((n) => ({ ...n, [id]: name })),
        () => {},
      );
    }
  }, [slug, missing]);
  return known ? { ...names, ...known } : names;
}
