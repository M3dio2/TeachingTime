"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

// A value remembered in this browser (localStorage), e.g. a panel width. Personal, never synced.
// Only used in the lesson room, which renders on the client only (after the token fetch).
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage blocked: the size just isn't remembered.
      }
    },
    [key],
  );
  return [value, set] as const;
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function useWindowWidth() {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth,
    () => 1440,
  );
}
