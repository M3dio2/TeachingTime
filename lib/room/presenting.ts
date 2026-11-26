"use client";

import { useSyncExternalStore } from "react";

// A landscape PDF (most likely a presentation) on screen: the room folds the files panel away
// so the slides get the width (DesktopRoom). PdfPane reports while it shows one.
const shown = new Set<string>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

export function showingLandscape(id: string, on: boolean) {
  if (on === shown.has(id)) return;
  if (on) shown.add(id);
  else shown.delete(id);
  changed();
}

export function useLandscapeShown() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => shown.size > 0,
    () => false,
  );
}

// Landscape: most pages wider than tall.
export function isLandscape(ratios: number[]) {
  return ratios.length > 0 && ratios.filter((r) => r < 1).length * 2 > ratios.length;
}
