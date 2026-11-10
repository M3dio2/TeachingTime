"use client";

import { type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { useStored } from "@/lib/useStored";

export type Corner = "tl" | "tr" | "bl" | "br";
const GAP = 12; // px from the edges of the area

// Something floating over an area (cameras on a tablet-sized window). Drag it anywhere; on
// release it snaps to the nearest corner, which is remembered in this browser. Keyboard: focus
// it and use the arrow keys to pick a corner. The parent must be `position: relative`.
export default function Floating({
  storageKey,
  defaultCorner = "br",
  label,
  className = "",
  children,
  testId,
}: {
  storageKey: string;
  defaultCorner?: Corner;
  label: string;
  className?: string;
  children: ReactNode | ((corner: Corner) => ReactNode);
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [corner, setCorner] = useStored<Corner>(storageKey, defaultCorner);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const start = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const area = el?.offsetParent?.getBoundingClientRect();
    if (e.button !== 0 || !el || !area) return;
    e.preventDefault();
    const box = el.getBoundingClientRect();
    const dx = e.clientX - box.left;
    const dy = e.clientY - box.top;
    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
    let last: { x: number; y: number } | null = null;

    const move = (ev: globalThis.PointerEvent) => {
      last = {
        x: clamp(ev.clientX - area.left - dx, area.width - box.width),
        y: clamp(ev.clientY - area.top - dy, area.height - box.height),
      };
      setDrag(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (!last) return; // a click, not a drag
      const top = last.y + box.height / 2 < area.height / 2;
      const left = last.x + box.width / 2 < area.width / 2;
      setCorner(`${top ? "t" : "b"}${left ? "l" : "r"}`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const [v, h] = corner.split("") as ["t" | "b", "l" | "r"];
    const next = {
      ArrowUp: `t${h}`,
      ArrowDown: `b${h}`,
      ArrowLeft: `${v}l`,
      ArrowRight: `${v}r`,
    }[e.key] as Corner | undefined;
    if (!next) return;
    e.preventDefault();
    setCorner(next);
  };

  const place = drag
    ? { left: drag.x, top: drag.y }
    : {
        [corner[0] === "t" ? "top" : "bottom"]: GAP,
        [corner[1] === "l" ? "left" : "right"]: GAP,
      };

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label={`${label}. Drag to move, or use the arrow keys.`}
      title="Drag to move"
      data-testid={testId}
      data-corner={corner}
      onPointerDown={start}
      onKeyDown={key}
      onDragStart={(e) => e.preventDefault()}
      className={`absolute z-10 touch-none select-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
        drag ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
      style={place}
    >
      {typeof children === "function" ? children(corner) : children}
    </div>
  );
}
