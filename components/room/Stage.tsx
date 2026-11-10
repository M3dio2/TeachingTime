"use client";

import {
  Columns2,
  Eye,
  FileText,
  ImageIcon,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Square,
  SquarePlus,
  Type,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import Chip from "@/components/ui/Chip";
import Handle from "@/components/ui/Handle";
import Marker from "@/components/ui/Marker";
import {
  addableTabs,
  MIN_TAB_PX,
  SPLIT_MIN_PX,
  tabLabel,
  type TabId,
  type Where,
} from "@/lib/room/tabs";
import { useStored } from "@/lib/useStored";
import { cap, type RoomModel } from "./roomModel";
import { type RoomFile, tabOf } from "./FilesPanel";
import AudioBar from "./AudioBar";
import TabPane from "./TabPane";

const ICONS: Record<string, typeof Monitor> = {
  screen: Monitor,
  text: Type,
  draw: Pencil,
  pdf: FileText,
  image: ImageIcon,
};
export const TabIcon = ({ id, size = 16 }: { id: TabId; size?: number }) => {
  const Icon = ICONS[id.split(":")[0]];
  return <Icon size={size} aria-hidden className="shrink-0" />;
};

// The stage (desktop): browser-style tab bar, then one or two tabs side by side.
// `overlay` sits over the panes (the floating cameras on narrow windows).
export default function Stage({
  model,
  overlay,
  dragging,
  onDropped,
}: {
  model: RoomModel;
  overlay?: ReactNode;
  dragging?: RoomFile | null;
  onDropped?: () => void;
}) {
  const { tabs, active, layout } = model.view;
  const area = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useStored("room-split-ratio", 0.5);

  // Side by side needs room for two tabs on *this* screen; below that, one at a time by itself.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const canSplit = width === 0 || width >= SPLIT_MIN_PX;
  const isSplit = tabs.length === 2 && layout === "split" && canSplit;

  const dragSplit = (x: number) => {
    const r = area.current?.getBoundingClientRect();
    if (!r) return;
    const min = Math.min(0.5, MIN_TAB_PX / r.width);
    setRatio(Math.max(min, Math.min(1 - min, (x - r.left) / r.width)));
  };

  return (
    <section
      aria-label="Lesson"
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface"
    >
      <AudioBar model={model} />
      <TabStrip model={model} isSplit={isSplit} canSplit={canSplit} />
      <div
        ref={area}
        data-testid="stage"
        data-layout={isSplit ? "split" : "single"}
        className={`relative flex min-h-0 flex-1 ${isSplit ? "bg-paper p-2" : "bg-surface"}`}
      >
        {overlay}
        {dragging && model.actions && (
          <DropZones model={model} file={dragging} onDone={() => onDropped?.()} />
        )}
        {tabs.map((id, i) => {
          const visible = isSplit || i === active;
          // The whiteboard mounts only while visible (Excalidraw can't measure a hidden
          // canvas); the text pad stays mounted while its tab is open.
          if (!visible && id !== "text") return null;
          const outline = isSplit ? (i === active ? "border-accent" : "border-line") : "";
          return (
            <div
              key={id}
              data-tab={id}
              hidden={!visible}
              className={`relative min-w-0 overflow-hidden bg-surface ${
                isSplit ? `rounded-md border-2 ${outline}` : ""
              }`}
              style={{
                order: i * 2,
                flex: isSplit ? `${i === 0 ? ratio : 1 - ratio} 1 0` : "1 1 0",
              }}
            >
              <TabPane id={id} model={model} />
            </div>
          );
        })}
        {isSplit && (
          <div className="flex" style={{ order: 1 }}>
            <Handle
              wide
              label="Resize the two tabs"
              onDrag={dragSplit}
              onStep={(d) => setRatio(Math.max(0.25, Math.min(0.75, ratio + d * 0.05)))}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TabStrip({ model, isSplit, canSplit }: { model: RoomModel; isSplit: boolean; canSplit: boolean }) {
  const { tabs, active } = model.view;
  const { actions } = model;
  const teacher = Boolean(actions);

  return (
    <div className="flex shrink-0 items-end gap-2 border-b border-line bg-surface-2 px-2 pt-1.5">
      <div role="tablist" aria-label="Open tabs" className="flex min-w-0 items-end gap-0.5 overflow-x-auto">
        {tabs.map((id, i) => {
          const marked = i === active;
          const shown = isSplit || marked;
          return (
            <div
              key={id}
              className={`relative isolate -mb-px flex max-w-60 min-w-0 items-center rounded-t-md border ${
                shown ? "border-line border-b-surface bg-surface" : "border-transparent"
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={marked}
                disabled={!teacher}
                onClick={() => actions?.pick(i)}
                className={`flex h-9 min-w-0 items-center gap-2 px-3 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  shown ? "text-ink" : "text-ink-muted"
                } ${marked ? "font-semibold" : "font-medium"} ${teacher ? "" : "cursor-default"}`}
              >
                <TabIcon id={id} />
                <span className="truncate">{tabLabel(id, model.names)}</span>
              </button>
              {teacher && tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close ${tabLabel(id, model.names)}`}
                  title={`Close ${tabLabel(id, model.names)}`}
                  onClick={() => actions?.close(i)}
                  className="mr-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <X size={14} aria-hidden />
                </button>
              )}
              {marked && (
                <Marker
                  key={`${id}-${i}`}
                  shape="underline"
                  className="absolute bottom-px left-2.5 -z-10 h-2 w-[calc(100%-1.25rem)]"
                />
              )}
            </div>
          );
        })}
      </div>

      {teacher && tabs.length < 2 && <AddTabMenu model={model} />}

      <span className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-2 px-1 pb-1.5">
        <Chip tone="marker">
          <Eye size={14} aria-hidden />
          {teacher ? `${cap(model.otherName)} sees what you see` : `Following ${model.otherName}`}
        </Chip>
        {teacher && tabs.length === 2 && (
          <LayoutSwitch isSplit={isSplit} canSplit={canSplit} onChange={(l) => actions?.setLayout(l)} />
        )}
        {teacher && (
          <button
            type="button"
            onClick={() => actions?.setJustTalk(true)}
            title="Fold the tabs away for both of you"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium whitespace-nowrap hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Users size={16} aria-hidden />
            Just talk
          </button>
        )}
      </div>
    </div>
  );
}

function LayoutSwitch({
  isSplit,
  canSplit,
  onChange,
}: {
  isSplit: boolean;
  canSplit: boolean;
  onChange: (layout: "split" | "single") => void;
}) {
  const button = (on: boolean) =>
    `inline-flex h-[26px] w-[30px] items-center justify-center rounded disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
      on ? "bg-surface-2 text-accent" : "text-ink-muted hover:text-ink"
    }`;
  return (
    <div className="inline-flex gap-0.5 rounded-md border border-line bg-surface p-0.5">
      <button
        type="button"
        aria-pressed={isSplit}
        aria-label="Side by side"
        title={canSplit ? "Side by side" : "Side by side needs a wider window"}
        disabled={!canSplit}
        onClick={() => onChange("split")}
        className={button(isSplit)}
      >
        <Columns2 size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={!isSplit}
        aria-label="One at a time"
        title="One at a time"
        onClick={() => onChange("single")}
        className={button(!isSplit)}
      >
        <Square size={16} aria-hidden />
      </button>
    </div>
  );
}

// + (teacher, only while one tab is open): Screen (while someone shares), Text, Draw.
function AddTabMenu({ model }: { model: RoomModel }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { tabs, active } = model.view;
  const items = addableTabs({ ...model.view, screenReplaced: null }, model.sharing);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // As tall as a tab, so the + sits level with the tab labels.
    <div ref={wrap} className="relative flex h-9 shrink-0 items-center self-end">
      <button
        type="button"
        aria-label="Open a tab"
        title="Open a tab"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          open ? "text-accent" : "text-ink-muted"
        }`}
      >
        <Plus size={16} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Open a tab"
          className="absolute top-full left-0 z-30 mt-1 flex w-72 flex-col gap-0.5 rounded-panel border border-line bg-surface p-1.5 shadow-soft"
        >
          <div className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-ink-muted">Open a tab</div>
          {items.map((id) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => {
                model.actions?.open(id);
                setOpen(false);
              }}
              className="flex h-10 items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium hover:bg-paper focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <TabIcon id={id} />
              <span className="flex-1">{tabLabel(id, model.names)}</span>
              <span className="truncate text-xs font-normal text-ink-muted">
                Opens beside {tabLabel(tabs[active], model.names)}
              </span>
            </button>
          ))}
          {!items.length && (
            <div className="px-2.5 py-2 text-[13px] text-ink-muted">Text and Draw are already open.</div>
          )}
        </div>
      )}
    </div>
  );
}

// While a file is dragged from the panel: two drop areas over the stage. One tab open:
// "Replace …" (left) and "Open beside …" (right); two open: "Replace …" for each. The area
// under the pointer turns solid and shows "Drop to open".
function DropZones({ model, file, onDone }: { model: RoomModel; file: RoomFile; onDone: () => void }) {
  const [over, setOver] = useState<number | null>(null);
  const { tabs } = model.view;
  const id = tabOf(file);
  const zones: { where: Where; title: string; sub: string; beside: boolean }[] =
    tabs.length < 2
      ? [
          { where: 0, title: `Replace ${tabLabel(tabs[0], model.names)}`, sub: "Show it instead", beside: false },
          {
            where: "beside",
            title: `Open beside ${tabLabel(tabs[0], model.names)}`,
            sub: "Show both side by side",
            beside: true,
          },
        ]
      : tabs.map((t, i) => ({
          where: i,
          title: `Replace ${tabLabel(t, model.names)}`,
          sub: "Two tabs is the most",
          beside: false,
        }));

  return (
    <div className="absolute inset-0 z-20 flex gap-2 bg-paper/90 p-2" data-testid="drop-zones">
      {zones.map((z, i) => {
        const hot = over === i;
        const Icon = z.beside ? SquarePlus : RefreshCw;
        return (
          <div
            key={i}
            data-testid={`drop-${i}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              if (over !== i) setOver(i);
            }}
            onDragLeave={(e) => {
              // Moving onto the zone's own text counts as leaving it; that doesn't.
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setOver((o) => (o === i ? null : o));
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (id) model.actions?.openAt(id, z.where);
              onDone();
            }}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed p-4 text-center ${
              hot ? "border-accent bg-surface" : "border-ink-muted bg-surface/55"
            }`}
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-accent">
              <Icon size={22} aria-hidden />
            </span>
            <span className="text-base font-semibold">{z.title}</span>
            <span className="text-[13px] text-ink-muted">{z.sub}</span>
            {hot && (
              <span className="inline-flex -rotate-2 items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium shadow-soft">
                <TabIcon id={id ?? "text"} />
                {file.name}
                <span className="rounded bg-marker-soft px-1.5 text-xs text-marker-ink">Drop to open</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
