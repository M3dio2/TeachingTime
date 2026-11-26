"use client";

import {
  Columns2,
  Eye,
  FileText,
  FileType2,
  Link2,
  ListChecks,
  ImageIcon,
  Monitor,
  SquarePlay,
  Music,
  Pencil,
  Plus,
  RefreshCw,
  ScrollText,
  Square,
  SquarePlus,
  Type,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Chip from "@/components/ui/Chip";
import Handle from "@/components/ui/Handle";
import Marker from "@/components/ui/Marker";
import {
  type BuiltInTab,
  type FileTabKind,
  addableTabs,
  MIN_TAB_PX,
  SPLIT_MIN_PX,
  tabLabel,
  type TabId,
  type Where,
} from "@/lib/room/tabs";
import { useT } from "@/lib/i18n/client";
import { useStored } from "@/lib/useStored";
import { cap, type RoomModel } from "./roomModel";
import { type RoomFile, tabOf } from "./FilesPanel";
import AudioBar from "./AudioBar";
import TabPane from "./TabPane";

// Typed by tab kind, so a new kind without an icon is a type error.
const ICONS: Record<BuiltInTab | FileTabKind, typeof Monitor> = {
  screen: Monitor,
  text: Type,
  draw: Pencil,
  pdf: FileText,
  doc: FileType2,
  video: SquarePlay,
  link: Link2,
  image: ImageIcon,
  quiz: ListChecks,
  txt: ScrollText,
};
export const TabIcon = ({ id, size = 16 }: { id: TabId; size?: number }) => {
  const Icon = ICONS[id.split(":")[0] as BuiltInTab | FileTabKind];
  return <Icon size={size} aria-hidden className="shrink-0" />;
};

// The stage (desktop): browser-style tab bar, then one or two tabs side by side.
export default function Stage({
  model,
  dragging,
  onDropped,
}: {
  model: RoomModel;
  dragging?: RoomFile | null;
  onDropped?: () => void;
}) {
  const t = useT();
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

  // Teacher: tell the room whether two tabs fit here, so a narrow window publishes "one at a
  // time" and the student sees the same single tab instead of both.
  const reportFits = model.reportStageFits;
  useEffect(() => {
    reportFits?.(canSplit);
  }, [reportFits, canSplit]);

  // Student whose window is too narrow for the teacher's two tabs: she sees the teacher's
  // active tab and may click the other one; her choice lasts until the teacher switches tabs,
  // opens or closes one (as on phones).
  const followKey = `${tabs.join(",")}|${active}`;
  const [peek, setPeek] = useState({ key: followKey, index: active });
  if (peek.key !== followKey) setPeek({ key: followKey, index: active });
  const studentPicks = !model.actions && tabs.length === 2 && !isSplit;
  const shown = studentPicks && peek.key === followKey ? peek.index : active;

  const dragSplit = (x: number) => {
    const r = area.current?.getBoundingClientRect();
    if (!r) return;
    const min = Math.min(0.5, MIN_TAB_PX / r.width);
    setRatio(Math.max(min, Math.min(1 - min, (x - r.left) / r.width)));
  };

  return (
    <section
      aria-label={t.stage.lesson}
      data-record="stage"
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface"
    >
      <AudioBar model={model} />
      <TabStrip
        model={model}
        isSplit={isSplit}
        canSplit={canSplit}
        shown={shown}
        onStudentPick={studentPicks ? (i) => setPeek({ key: followKey, index: i }) : undefined}
      />
      <div
        ref={area}
        data-testid="stage"
        data-layout={isSplit ? "split" : "single"}
        className={`relative flex min-h-0 flex-1 ${isSplit ? "bg-paper p-2" : "bg-surface"}`}
      >
        {dragging && model.actions && (
          <DropZones model={model} file={dragging} onDone={() => onDropped?.()} />
        )}
        {tabs.map((id, i) => {
          const visible = isSplit || i === shown;
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
              label={t.stage.resizeTabs}
              onDrag={dragSplit}
              onStep={(d) => setRatio(Math.max(0.25, Math.min(0.75, ratio + d * 0.05)))}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TabStrip({
  model,
  isSplit,
  canSplit,
  shown,
  onStudentPick,
}: {
  model: RoomModel;
  isSplit: boolean;
  canSplit: boolean;
  shown: number;
  onStudentPick?: (index: number) => void;
}) {
  const t = useT();
  const label = (id: TabId) => tabLabel(id, model.names, t.stage.tabs);
  const { tabs } = model.view;
  const active = shown;
  const { actions } = model;
  const teacher = Boolean(actions);

  return (
    <div className="flex shrink-0 items-end gap-2 border-b border-line bg-surface-2 px-2 pt-1.5">
      <div role="tablist" aria-label={t.stage.openTabs} className="flex min-w-0 items-end gap-0.5 overflow-x-auto">
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
                disabled={!teacher && !onStudentPick}
                onClick={() => (teacher ? actions?.pick(i) : onStudentPick?.(i))}
                className={`flex h-9 min-w-0 items-center gap-2 px-3 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  shown ? "text-ink" : "text-ink-muted"
                } ${marked ? "font-semibold" : "font-medium"} ${teacher || onStudentPick ? "" : "cursor-default"}`}
              >
                <TabIcon id={id} />
                <span className="truncate">{label(id)}</span>
              </button>
              {teacher && tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={t.stage.closeTab(label(id))}
                  title={t.stage.closeTab(label(id))}
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
          {teacher ? t.stage.seesWhatYouSee(cap(model.otherName)) : t.stage.following(model.otherName)}
        </Chip>
        {teacher && tabs.length === 2 && (
          <LayoutSwitch isSplit={isSplit} canSplit={canSplit} onChange={(l) => actions?.setLayout(l)} />
        )}
        {teacher && (
          <button
            type="button"
            onClick={() => actions?.setJustTalk(true)}
            title={t.stage.justTalkTitle}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium whitespace-nowrap hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Users size={16} aria-hidden />
            {t.stage.justTalk}
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
  const t = useT();
  const button = (on: boolean) =>
    `inline-flex h-[26px] w-[30px] items-center justify-center rounded disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
      on ? "bg-surface-2 text-accent" : "text-ink-muted hover:text-ink"
    }`;
  return (
    <div className="inline-flex gap-0.5 rounded-md border border-line bg-surface p-0.5">
      <button
        type="button"
        aria-pressed={isSplit}
        aria-label={t.stage.sideBySide}
        title={canSplit ? t.stage.sideBySide : t.stage.sideBySideNeedsWider}
        disabled={!canSplit}
        onClick={() => onChange("split")}
        className={button(isSplit)}
      >
        <Columns2 size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={!isSplit}
        aria-label={t.stage.oneAtATime}
        title={t.stage.oneAtATime}
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
  const t = useT();
  const label = (id: TabId) => tabLabel(id, model.names, t.stage.tabs);
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
        aria-label={t.stage.openATab}
        title={t.stage.openATab}
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
          aria-label={t.stage.openATab}
          className="absolute top-full left-0 z-30 mt-1 flex w-72 flex-col gap-0.5 rounded-panel border border-line bg-surface p-1.5 shadow-soft"
        >
          <div className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-ink-muted">{t.stage.openATab}</div>
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
              <span className="flex-1">{label(id)}</span>
              <span className="truncate text-xs font-normal text-ink-muted">
                {t.stage.opensBeside(label(tabs[active]))}
              </span>
            </button>
          ))}
          {!items.length && (
            <div className="px-2.5 py-2 text-[13px] text-ink-muted">{t.stage.textAndDrawOpen}</div>
          )}
        </div>
      )}
    </div>
  );
}

// While a file is dragged from the panel: two drop areas over the stage. One tab open:
// "Replace …" (left) and "Open beside …" (right); two open: "Replace …" for each. Audio: one
// area, "Play …". The area under the pointer turns solid and shows "Drop to open" / "to play".
function DropZones({ model, file, onDone }: { model: RoomModel; file: RoomFile; onDone: () => void }) {
  const t = useT();
  const d = t.stage.drop;
  const label = (tab: TabId) => tabLabel(tab, model.names, t.stage.tabs);
  const [over, setOver] = useState<number | null>(null);
  const { tabs } = model.view;
  const id = tabOf(file);
  const audio = file.kind === "audio";
  // Audio isn't a tab: one area that plays it for both, whatever is open.
  const zones: { where: Where | "play"; title: string; sub: string; beside: boolean }[] = audio
    ? [{ where: "play", title: d.play(file.name), sub: d.playSub, beside: false }]
    : tabs.length < 2
      ? [
          { where: 0, title: d.replace(label(tabs[0])), sub: d.replaceSub, beside: false },
          {
            where: "beside",
            title: d.openBeside(label(tabs[0])),
            sub: d.besideSub,
            beside: true,
          },
        ]
      : tabs.map((tab, i) => ({
          where: i,
          title: d.replace(label(tab)),
          sub: d.twoIsMost,
          beside: false,
        }));

  return (
    <div className="absolute inset-0 z-20 flex gap-2 bg-paper/90 p-2" data-testid="drop-zones">
      {zones.map((z, i) => {
        const hot = over === i;
        const Icon = audio ? Music : z.beside ? SquarePlus : RefreshCw;
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
              if (z.where === "play") model.audio?.play({ id: file.id, name: file.name });
              else if (id) model.actions?.openAt(id, z.where);
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
                {audio ? <Music size={14} aria-hidden /> : <TabIcon id={id ?? "text"} />}
                {file.name}
                <span className="rounded bg-marker-soft px-1.5 text-xs text-marker-ink">
                  {audio ? d.dropToPlay : d.dropToOpen}
                </span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
