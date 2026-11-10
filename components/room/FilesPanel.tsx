"use client";

import { FileText, ImageIcon, Music, PanelRightClose, PanelRightOpen, type LucideIcon } from "lucide-react";

// A classroom file, as the room's files panel lists it (app/lesson/[id]/page.tsx).
export type RoomFile = {
  id: string;
  kind: "image" | "pdf" | "audio";
  name: string;
  previewUrl?: string; // pictures only
};

const SECTIONS: { kind: RoomFile["kind"]; title: string; Icon: LucideIcon }[] = [
  { kind: "pdf", title: "PDFs", Icon: FileText },
  { kind: "image", title: "Pictures", Icon: ImageIcon },
  { kind: "audio", title: "Audio", Icon: Music },
];

// "Anna's files" on the right of the stage (teacher, student lessons only). L1 lists the
// files; opening them (click or drag onto the stage) comes in L2a, so nothing is clickable yet.
export function FilesPanel({
  title,
  files,
  width,
  onFold,
}: {
  title: string;
  files: RoomFile[];
  width: number;
  onFold: () => void;
}) {
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
      <FileList files={files} />
    </aside>
  );
}

// The list, also used in the phone's Files sheet.
export function FileList({ files }: { files: RoomFile[] }) {
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
                {items.map((f) => (
                  <li key={f.id} className="min-w-0">
                    <span className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-surface-2 text-ink-muted">
                      {f.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Icon size={16} aria-hidden />
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-ink-muted">{f.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-col">
                {items.map((f) => (
                  <li key={f.id} className="flex items-center gap-2.5 rounded-md p-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                  </li>
                ))}
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
