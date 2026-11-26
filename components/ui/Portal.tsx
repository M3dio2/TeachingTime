"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

// Dialogs render at the end of <body>, so a sticky or transformed parent (its own stacking
// context) can't put page content above them.
export default function Portal({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return ready ? createPortal(children, document.body) : null;
}
