"use client";

import { Download, Eraser, Hand, Highlighter, PenLine, Trash2, Type } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import type * as Y from "yjs";
import {
  addInk,
  HIGHLIGHT_WIDTH,
  hits,
  type InkItem,
  PEN_WIDTH,
  type PickedTool,
  pathOf,
  removeInk,
  TEXT_SIZE,
} from "@/lib/room/pdfInk";

const TOOLS: { id: PickedTool; label: string; Icon: typeof Hand }[] = [
  { id: "scroll", label: "Scroll", Icon: Hand },
  { id: "pen", label: "Pen", Icon: PenLine },
  { id: "highlighter", label: "Highlighter", Icon: Highlighter },
  { id: "text", label: "Text", Icon: Type },
  { id: "eraser", label: "Eraser", Icon: Eraser },
];

// The PDF tab's toolbar (docs/mockups/pdf-drawing.html), sticky at the top of the pages.
export function InkToolbar({
  tool,
  onTool,
  canEdit,
  onClear,
  onSave,
  saving,
}: {
  tool: PickedTool;
  onTool: (tool: PickedTool) => void;
  canEdit: boolean;
  onClear?: () => void; // teacher
  onSave?: () => void; // teacher in a student lesson
  saving?: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Write on the PDF"
      className="sticky top-2 z-10 flex h-[42px] shrink-0 items-center gap-0.5 self-center rounded-panel border border-line bg-surface p-1 shadow-soft"
    >
      {TOOLS.map(({ id, label, Icon }) => {
        const on = canEdit && tool === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            title={canEdit ? label : `${label} (your teacher hasn't let you write)`}
            aria-pressed={on}
            disabled={!canEdit}
            onClick={() => onTool(id)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-40 ${
              on ? "bg-marker-soft text-marker-ink" : "text-ink hover:bg-surface-2"
            }`}
          >
            <Icon size={16} aria-hidden />
          </button>
        );
      })}
      {onClear && (
        <>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <button
            type="button"
            aria-label="Clear the writing on this PDF for both of you"
            title="Clear the writing on this PDF for both of you"
            onClick={() => {
              if (confirm("Clear the writing on this PDF for both of you?")) onClear();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </>
      )}
      {onSave && (
        <>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            title="Save a copy with the writing in the classroom"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
          >
            <Download size={16} aria-hidden />
            <span className="hidden @[420px]:inline">{saving ? "Saving…" : "Save as new PDF"}</span>
            <span className="sr-only @[420px]:hidden">{saving ? "Saving…" : "Save as new PDF"}</span>
          </button>
        </>
      )}
    </div>
  );
}

function Item({ item }: { item: InkItem }) {
  if (item.tool === "text" && item.at && item.text) {
    return (
      <text
        x={item.at[0]}
        y={item.at[1]}
        fontSize={TEXT_SIZE}
        fontFamily="Helvetica, Arial, sans-serif"
        className="fill-ink"
      >
        {item.text}
      </text>
    );
  }
  const highlight = item.tool === "highlighter";
  return (
    <path
      d={pathOf(item.pts ?? [])}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={highlight ? HIGHLIGHT_WIDTH : PEN_WIDTH}
      className={highlight ? "stroke-marker opacity-50 mix-blend-multiply" : "stroke-ink"}
    />
  );
}

// The writing on one page: an SVG over the canvas, in page-width units. With Scroll (or
// without "can edit") it lets touches through, so the PDF scrolls as before.
export function InkLayer({
  doc,
  file,
  page,
  items,
  tool,
  canEdit,
  width,
  height,
}: {
  doc: Y.Doc;
  file: string;
  page: number;
  items: [string, InkItem][];
  tool: PickedTool;
  canEdit: boolean;
  width: number;
  height: number;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef<number[] | null>(null);
  const [live, setLive] = useState<number[] | null>(null);
  const [typing, setTyping] = useState<{ x: number; y: number } | null>(null);
  const active = canEdit && tool !== "scroll";

  const at = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width] as const;
  };
  const erase = (e: React.PointerEvent) => {
    const [x, y] = at(e);
    const gone = hits(items, x, y);
    if (gone.length) removeInk(doc, gone);
  };

  const ratio = width ? height / width : 1;
  let text: ReactNode = null;
  if (typing) {
    const commit = (value: string) => {
      if (value.trim()) addInk(doc, { file, page, tool: "text", at: [typing.x, typing.y], text: value.trim() });
      setTyping(null);
    };
    text = (
      <input
        autoFocus
        aria-label="Text on the PDF"
        placeholder="Type, then Enter"
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
          if (e.key === "Escape") setTyping(null);
        }}
        onBlur={(e) => commit(e.currentTarget.value)}
        className="absolute z-10 min-w-40 rounded-sm border border-accent bg-surface/90 px-1 text-ink outline-none"
        style={{
          left: typing.x * width - 5,
          top: (typing.y - TEXT_SIZE) * width - 4,
          fontSize: TEXT_SIZE * width,
          fontFamily: "Helvetica, Arial, sans-serif",
          lineHeight: 1.2,
        }}
      />
    );
  }

  return (
    <>
      <svg
        ref={svg}
        data-testid={`ink-page-${page + 1}`}
        viewBox={`0 0 1 ${ratio}`}
        className="absolute inset-0 h-full w-full"
        style={{
          pointerEvents: active ? "auto" : "none",
          touchAction: active ? "none" : "auto",
          cursor: !active ? undefined : tool === "text" ? "text" : "crosshair",
        }}
        onPointerDown={(e) => {
          if (!active || e.button > 0) return;
          e.preventDefault();
          if (tool === "text") {
            const [x, y] = at(e);
            setTyping({ x, y: y + TEXT_SIZE / 2 });
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          if (tool === "eraser") return erase(e);
          drawing.current = [...at(e)];
          setLive(drawing.current);
        }}
        onPointerMove={(e) => {
          if (!active) return;
          if (tool === "eraser") {
            if (e.buttons) erase(e);
            return;
          }
          if (!drawing.current) return;
          const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
          for (const ev of events.length ? events : [e.nativeEvent]) drawing.current.push(...at(ev));
          setLive([...drawing.current]);
        }}
        onPointerUp={() => {
          const pts = drawing.current;
          drawing.current = null;
          setLive(null);
          if (pts && (tool === "pen" || tool === "highlighter")) addInk(doc, { file, page, tool, pts });
        }}
        onPointerCancel={() => {
          drawing.current = null;
          setLive(null);
        }}
      >
        {items.map(([id, item]) => (
          <Item key={id} item={item} />
        ))}
        {live && (tool === "pen" || tool === "highlighter") && (
          <Item item={{ file, page, tool, pts: live }} />
        )}
      </svg>
      {text}
    </>
  );
}
