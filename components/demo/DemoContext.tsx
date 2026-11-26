"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

// Review A1: the demo lesson. Present only on /demo: the room then shows Lucía's drawn camera
// instead of LiveKit tiles, a demo bar instead of mic/camera/share/record, and the guide.
export type DemoState = {
  here: boolean; // Lucía has "joined"
  caption: string | null; // what Lucía is saying right now (a speech bubble on her camera)
  say: (text: string, ms?: number) => void;
  arrive: () => void;
  onLeave: () => void;
};

const DemoContext = createContext<DemoState | null>(null);
export const useDemo = () => useContext(DemoContext);

export function DemoProvider({ onLeave, children }: { onLeave: () => void; children: ReactNode }) {
  const [here, setHere] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = useCallback((text: string, ms = 4500) => {
    clearTimeout(timer.current);
    setCaption(text);
    timer.current = setTimeout(() => setCaption(null), ms);
  }, []);
  const arrive = useCallback(() => setHere(true), []);
  const value = useMemo(() => ({ here, caption, say, arrive, onLeave }), [here, caption, say, arrive, onLeave]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
