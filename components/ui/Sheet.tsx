"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

// A phone bottom sheet (docs/DESIGN.md, "Sheet"): dimmed backdrop, `surface` panel with rounded
// top corners, a grab bar and a close button. Tapping the backdrop or Escape closes it.
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-video/45">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1 cursor-default" />
      <div
        role="dialog"
        aria-label={title}
        className="flex max-h-[70%] flex-col gap-1 rounded-t-2xl bg-surface px-3 pt-2 pb-5 shadow-soft"
      >
        <span aria-hidden className="mx-auto mt-0.5 mb-1.5 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="text-[17px] font-semibold">{title}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
