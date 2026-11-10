"use client";

import type { KeyboardEvent, PointerEvent } from "react";

// A resize handle (docs/DESIGN.md, "Handle"): a <button> with an 8 px hit area (12 px between
// tabs) and a thin `line` mark that turns `accent` on hover and focus. Pointer drag reports the
// pointer's x; Arrow Left/Right report a step of -1 / +1.
export default function Handle({
  label,
  onDrag,
  onStep,
  wide = false,
}: {
  label: string;
  onDrag: (clientX: number) => void;
  onStep: (direction: -1 | 1) => void;
  wide?: boolean;
}) {
  const start = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus();
    const move = (ev: globalThis.PointerEvent) => onDrag(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
  };
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    const direction = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    e.preventDefault();
    onStep(direction);
  };

  return (
    <button
      type="button"
      aria-label={label}
      title="Drag to resize. Arrow keys work too."
      onPointerDown={start}
      onKeyDown={key}
      className={`group flex shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch focus-visible:outline-none ${
        wide ? "w-3" : "w-2"
      }`}
    >
      <span
        className={`rounded-full bg-line transition-colors group-hover:bg-accent group-focus-visible:bg-accent ${
          wide ? "h-10 w-1" : "h-8 w-0.5"
        }`}
      />
    </button>
  );
}
