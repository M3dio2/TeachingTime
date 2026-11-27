"use client";

import { Check, Folder, FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createFolder, deleteFolder, moveToFolder, renameFolder } from "@/app/(app)/dashboard/library/actions";
import { buttonClass } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { inputClass } from "@/components/ui/Field";
import Portal from "@/components/ui/Portal";
import { useT } from "@/lib/i18n/client";

export type LibraryFolder = { id: string; name: string };
export type FolderView = "all" | "none" | string; // all files, files without a folder, a folder id

// The Library's folders (0021), one level: chips to show all files, those without a folder, or
// one folder; "New folder"; the open folder can be renamed or deleted (its files stay).
export function FolderBar({
  folders,
  counts,
  view,
  onView,
  onChanged,
}: {
  folders: LibraryFolder[];
  counts: { all: number; none: number; byFolder: Map<string, number> };
  view: FolderView;
  onView: (v: FolderView) => void;
  onChanged: () => void;
}) {
  const t = useT().library;
  const ask = useConfirm();
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = folders.find((f) => f.id === view);

  const chip = (id: FolderView, label: string, n: number, icon = false) => (
    <button
      key={id}
      type="button"
      aria-pressed={view === id}
      onClick={() => onView(id)}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
        view === id ? "border-ink bg-ink font-semibold text-paper" : "border-line bg-surface font-medium text-ink hover:border-ink-muted"
      }`}
    >
      {icon && <Folder size={14} aria-hidden className={view === id ? "text-marker" : "text-accent"} />}
      <span className="max-w-[180px] truncate">{label}</span>
      <span className={`text-xs ${view === id ? "text-paper/70" : "text-ink-muted"}`}>{n}</span>
    </button>
  );

  const save = (name: string) =>
    start(async () => {
      setError(null);
      if (naming === "new") {
        const done = await createFolder(name);
        if ("error" in done) return setError(done.error === "tooMany" ? t.tooManyFolders : t.failed);
        onView(done.id);
      } else if (open) {
        const done = await renameFolder(open.id, name);
        if (done) return setError(t.failed);
      }
      setNaming(null);
      onChanged();
    });

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label={t.folders} className="flex flex-wrap items-center gap-1.5">
        {chip("all", t.allFiles, counts.all)}
        {folders.map((f) => chip(f.id, f.name, counts.byFolder.get(f.id) ?? 0, true))}
        {folders.length > 0 && counts.none > 0 && chip("none", t.noFolder, counts.none)}
        <button
          type="button"
          onClick={() => setNaming("new")}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-ink-muted px-3 text-sm font-medium text-ink hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <FolderPlus size={15} aria-hidden />
          {t.newFolder}
        </button>
      </div>
      {naming && <NameFolder initial={naming === "rename" ? (open?.name ?? "") : ""} pending={pending} onSave={save} onCancel={() => setNaming(null)} />}
      {open && !naming && (
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-[17px] font-semibold">
            <Folder size={17} aria-hidden className="text-accent" />
            {open.name}
          </h3>
          <button type="button" onClick={() => setNaming("rename")} className={buttonClass("ghost", "sm", "h-8 gap-1 px-2 text-ink!")}>
            <Pencil size={14} aria-hidden />
            {t.renameFolder}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!(await ask({ message: t.deleteFolderConfirm(open.name), detail: t.deleteFolderDetail, confirmLabel: t.deleteFolder })))
                return;
              start(async () => {
                await deleteFolder(open.id);
                onView("all");
                onChanged();
              });
            }}
            className={buttonClass("ghost", "sm", "h-8 gap-1 px-2 text-ink-muted! hover:text-danger!")}
          >
            <Trash2 size={14} aria-hidden />
            {t.deleteFolder}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function NameFolder({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: string;
  pending: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useT().library;
  const [name, setName] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name);
      }}
      className="flex max-w-[440px] gap-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        maxLength={60}
        aria-label={t.folderName}
        placeholder={t.folderNamePlaceholder}
        className={`${inputClass()} !h-10 min-w-0 flex-1`}
      />
      <button type="submit" disabled={pending || !name.trim()} className={buttonClass("primary", "sm", "h-10 gap-1 px-3 font-semibold")}>
        <Check size={15} aria-hidden />
        {t.save}
      </button>
      <button type="button" onClick={onCancel} aria-label={t.cancel} className={buttonClass("ghost", "sm", "h-10 w-10 px-0! text-ink!")}>
        <X size={16} aria-hidden />
      </button>
    </form>
  );
}

// "Move to folder": a list of the folders (and "No folder") for one or several files.
export function MoveToFolder({
  title,
  folders,
  current,
  fileIds,
  onDone,
  onClose,
}: {
  title: string;
  folders: LibraryFolder[];
  current?: string | null;
  fileIds: string[];
  onDone: () => void;
  onClose: () => void;
}) {
  const t = useT().library;
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const [naming, setNaming] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button[data-folder]")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const move = (folderId: string | null) =>
    start(async () => {
      setFailed(false);
      if (await moveToFolder(fileIds, folderId)) return setFailed(true);
      onDone();
      onClose();
    });
  const item = (id: string | null, label: string) => (
    <li key={id ?? "none"}>
      <button
        type="button"
        data-folder
        disabled={pending}
        onClick={() => move(id)}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-[15px] hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Folder size={16} aria-hidden className={id ? "text-accent" : "text-ink-muted"} />
        <span className="flex-1 truncate">{label}</span>
        {current === id && <Check size={16} aria-hidden className="text-accent" />}
      </button>
    </li>
  );
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={onClose}>
        <div
          ref={box}
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-folder-title"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[min(560px,90dvh)] w-full max-w-[400px] flex-col gap-3 rounded-panel bg-surface p-5 text-ink shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="move-folder-title" className="min-w-0 text-[18px] font-semibold break-words">
              {t.moveToFolderTitle(title)}
            </h2>
            <button type="button" onClick={onClose} aria-label={t.close} className={buttonClass("ghost", "sm", "h-9 w-9 shrink-0 px-0! text-ink!")}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <ul className="-mx-1 flex-1 overflow-y-auto px-1">
            {folders.map((f) => item(f.id, f.name))}
            {item(null, t.noFolder)}
          </ul>
          {naming ? (
            <NameFolder
              initial=""
              pending={pending}
              onCancel={() => setNaming(false)}
              onSave={(name) =>
                start(async () => {
                  const done = await createFolder(name);
                  if ("error" in done) return setFailed(true);
                  if (await moveToFolder(fileIds, done.id)) return setFailed(true);
                  onDone();
                  onClose();
                })
              }
            />
          ) : (
            <button type="button" onClick={() => setNaming(true)} className={buttonClass("ghost", "sm", "h-10 justify-start gap-1.5 px-2 text-ink!")}>
              <FolderPlus size={16} aria-hidden />
              {t.newFolderHere}
            </button>
          )}
          {failed && (
            <p role="alert" className="text-sm text-danger">
              {t.failed}
            </p>
          )}
        </div>
      </div>
    </Portal>
  );
}

