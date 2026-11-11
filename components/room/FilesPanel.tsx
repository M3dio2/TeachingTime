"use client";

import {
  FileText,
  FileType2,
  GripVertical,
  ImageIcon,
  LoaderCircle,
  Music,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { fileTabId, type FileTab } from "@/lib/room/tabs";
import type { RoomModel } from "./roomModel";

// A classroom file, as the room's files panel lists it (app/lesson/[id]/page.tsx).
export type RoomFile = {
  id: string;
  kind: "image" | "pdf" | "doc" | "audio";
  name: string;
  previewUrl?: string; // pictures only
};

const SECTIONS: { kind: RoomFile["kind"]; title: string; Icon: LucideIcon }[] = [
  { kind: "pdf", title: "PDFs", Icon: FileText },
  { kind: "doc", title: "Word files", Icon: FileType2 },
  { kind: "image", title: "Pictures", Icon: ImageIcon },
  { kind: "audio", title: "Audio", Icon: Music },
];

export const tabOf = (f: RoomFile): FileTab | null => (f.kind === "audio" ? null : fileTabId(f.kind, f.id));

// Opening a file from the panel or the phone sheet (docs/design/HANDOFF.md, "Opening files"):
// already open → it becomes active; one tab open → it opens beside; two open → nothing changes
// and the footer says why for 4 s.
export function useFileOpener(model: RoomModel) {
  const [fullHint, setFullHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tabs } = model.view;
  const open = (id: FileTab) => {
    if (!tabs.includes(id) && tabs.length >= 2) {
      setFullHint(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFullHint(false), 4000);
      return false;
    }
    model.actions?.openAt(id, "auto");
    return true;
  };
  return { open, fullHint, full: tabs.length >= 2 };
}

// "On screen" while visible, "In a tab" while open but hidden.
export function fileStatus(model: RoomModel, id: FileTab): "on" | "tab" | null {
  const { tabs, active, layout } = model.view;
  const at = tabs.indexOf(id);
  if (at === -1) return null;
  const split = tabs.length === 2 && layout === "split";
  return split || at === active ? "on" : "tab";
}

// "Anna's files" on the right of the stage (teacher, student lessons only). Click a PDF or a
// picture to show it, or drag it onto the stage (drop areas in Stage.tsx).
export function FilesPanel({
  title,
  files,
  width,
  onFold,
  model,
  onDrag,
}: {
  title: string;
  files: RoomFile[];
  width: number;
  onFold: () => void;
  model: RoomModel;
  onDrag: (file: RoomFile | null) => void;
}) {
  const opener = useFileOpener(model);
  const hint = opener.fullHint
    ? "Two tabs are open. Close one first, or drag the file onto a tab to replace it."
    : opener.full
      ? "Two tabs are open. Drag a file onto one to replace it."
      : "Click a PDF, Word file or picture to open it, press play for audio, or drag any file onto the stage.";
  return (
    <aside
      aria-label={title}
      className="flex min-w-0 shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-surface"
      style={{ width }}
    >
      <div className="flex h-[43px] shrink-0 items-center justify-between border-b border-line bg-surface-2 pr-2 pl-4">
        <span className="truncate text-[15px] font-semibold">{title}</span>
        <button
          type="button"
          aria-label="Fold the files"
          title="Fold the files"
          onClick={onFold}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <PanelRightClose size={16} aria-hidden />
        </button>
      </div>
      <FileList files={files} model={model} onOpen={opener.open} onDrag={onDrag} />
      {files.some((f) => f.kind !== "audio") && (
        <p
          aria-live="polite"
          className={`flex shrink-0 items-start gap-2 border-t border-line px-4 py-2.5 text-[13px] leading-snug ${
            opener.fullHint ? "bg-surface-2 text-ink" : "text-ink-muted"
          }`}
        >
          <GripVertical size={16} aria-hidden className="mt-px shrink-0" />
          {hint}
        </p>
      )}
    </aside>
  );
}

// The list, also used in the phone's Files sheet. PDFs and pictures open on click, audio plays
// with its button; on desktop all three can also be dragged onto the stage.
export function FileList({
  files,
  model,
  onOpen,
  onDrag,
}: {
  files: RoomFile[];
  model: RoomModel;
  onOpen: (id: FileTab) => void;
  onDrag?: (file: RoomFile | null) => void;
}) {
  // Dragging works the same for every kind: PDFs and pictures open in a tab, audio plays.
  const dragProps = (f: RoomFile) => ({
    draggable: Boolean(onDrag),
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", f.name);
      e.dataTransfer.effectAllowed = "copy";
      // After the browser has taken its drag picture, or the drop areas would be in it.
      setTimeout(() => onDrag?.(f), 0);
    },
    onDragEnd: () => setTimeout(() => onDrag?.(null), 0),
  });
  const fileProps = (f: RoomFile) => {
    const id = tabOf(f)!;
    return {
      type: "button" as const,
      title: onDrag ? "Click to open, or drag onto the stage" : `Show ${f.name}`,
      onClick: () => onOpen(id),
      ...dragProps(f),
    };
  };
  if (!files.length) {
    return (
      <p className="p-4 text-sm text-ink-muted">
        No files yet. Upload pictures, PDFs and audio in the classroom.
      </p>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-2 py-3">
      {SECTIONS.map(({ kind, title, Icon }) => {
        const items = files.filter((f) => f.kind === kind);
        if (!items.length) return null;
        return (
          <section key={kind} aria-label={title} className="flex flex-col gap-1">
            <h3 className="px-2 pb-1 text-[13px] font-semibold text-ink-muted">{title}</h3>
            {kind === "image" ? (
              <ul className="grid grid-cols-3 gap-2 px-2">
                {items.map((f) => {
                  const status = fileStatus(model, tabOf(f)!);
                  return (
                    <li key={f.id} className="min-w-0">
                      <button
                        {...fileProps(f)}
                        aria-label={`Open ${f.name}`}
                        className="block w-full min-w-0 cursor-grab rounded-md text-left focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                      >
                        <span className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-surface-2 text-ink-muted">
                          {f.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.previewUrl} alt="" draggable={false} className="h-full w-full object-cover" />
                          ) : (
                            <Icon size={16} aria-hidden />
                          )}
                          {status && (
                            <span
                              className={`absolute bottom-1 left-1 rounded-[3px] px-1 text-[10px] font-semibold ${
                                status === "on" ? "bg-marker-soft text-marker-ink" : "bg-surface-2 text-ink-muted"
                              }`}
                            >
                              {status === "on" ? "On screen" : "In a tab"}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-xs text-ink-muted">{f.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="flex flex-col">
                {items.map((f) => {
                  const row = (
                    <>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                    </>
                  );
                  if (kind === "audio") {
                    return <AudioRow key={f.id} file={f} model={model} drag={onDrag ? dragProps(f) : undefined} />;
                  }
                  const status = fileStatus(model, tabOf(f)!);
                  return (
                    <li key={f.id} data-file-id={f.id}>
                      <button
                        {...fileProps(f)}
                        className="flex w-full cursor-grab items-center gap-2.5 rounded-md p-2 text-left hover:bg-paper focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                      >
                        {row}
                        {status && (
                          <span
                            className={`shrink-0 rounded px-1.5 text-xs font-medium ${
                              status === "on" ? "bg-marker-soft text-marker-ink" : "bg-surface-2 text-ink-muted"
                            }`}
                          >
                            {status === "on" ? "On screen" : "In a tab"}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// The folded panel: a 48 px strip of icons; each one unfolds it.
export function FilesStrip({ title, onUnfold }: { title: string; onUnfold: () => void }) {
  const button =
    "inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";
  return (
    <aside
      aria-label={`${title}, folded`}
      className="flex w-12 shrink-0 flex-col items-center gap-1 rounded-panel border border-line bg-surface py-1.5"
    >
      <button
        type="button"
        aria-label={`Show ${title}`}
        title={`Show ${title}`}
        onClick={onUnfold}
        className={`${button} text-ink-muted`}
      >
        <PanelRightOpen size={16} aria-hidden />
      </button>
      <span aria-hidden className="my-1 h-px w-6 bg-line" />
      {SECTIONS.map(({ kind, title: label, Icon }) => (
        <button
          key={kind}
          type="button"
          aria-label={label}
          title={label}
          onClick={onUnfold}
          className={`${button} text-accent`}
        >
          <Icon size={16} aria-hidden />
        </button>
      ))}
    </aside>
  );
}

// An audio file (A1): a round play / pause button, and "Playing" while it plays for both.
function AudioRow({
  file,
  model,
  drag,
}: {
  file: RoomFile;
  model: RoomModel;
  drag?: React.HTMLAttributes<HTMLLIElement> & { draggable?: boolean };
}) {
  const audio = model.audio;
  const current = model.view.audio?.id === file.id ? model.view.audio : null;
  const playing = Boolean(current && current.pausedAt === null);
  const loading = audio?.loading === file.id;
  const label = `${playing ? "Pause" : "Play"} ${file.name}`;
  return (
    <li
      {...drag}
      data-file-id={file.id}
      title={drag ? "Press play, or drag onto the stage" : undefined}
      className={`flex items-center gap-2.5 rounded-md p-2 ${drag ? "cursor-grab hover:bg-paper" : ""}`}
    >
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={!audio || loading}
        onClick={() => (playing ? audio?.pause() : audio?.play({ id: file.id, name: file.name }))}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          playing ? "bg-accent text-white" : "bg-surface-2 text-accent hover:bg-line"
        }`}
      >
        {loading ? (
          <LoaderCircle size={14} aria-hidden className="animate-spin" />
        ) : playing ? (
          <Pause size={12} fill="currentColor" aria-hidden />
        ) : (
          <Play size={12} fill="currentColor" aria-hidden />
        )}
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
      {playing && <span className="shrink-0 rounded bg-marker-soft px-1.5 text-xs font-medium text-marker-ink">Playing</span>}
    </li>
  );
}
