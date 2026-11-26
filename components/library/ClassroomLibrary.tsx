"use client";

import { Library, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addLibraryFiles, removeFromClassroom } from "@/app/(app)/dashboard/library/actions";
import { formatSize } from "@/components/classroom/ClassroomFiles";
import { fileIcon } from "@/components/files/fileIcon";
import { buttonClass } from "@/components/ui/Button";
import Portal from "@/components/ui/Portal";
import type { ResourceKind } from "@/lib/files/uploadResource";
import { useT } from "@/lib/i18n/client";

export type SharedFile = { id: string; kind: ResourceKind; name: string; size: number; url?: string; all: boolean; here: boolean };

// The Classroom page's "From your Library" (mock-up 8's note): the Library files this student
// has, a × to take one out (files in all Classrooms are changed in the Library), and "Add from
// Library" with a searchable list.
export default function ClassroomLibrary({ lessonId, name, files }: { lessonId: string; name: string; files: SharedFile[] }) {
  const t = useT().library;
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  const here = files.filter((f) => f.all || f.here);
  const addable = files.filter((f) => !f.all && !f.here);

  return (
    <section aria-labelledby="library-here" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="library-here" className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[-0.01em]">
          <Library size={20} aria-hidden className="text-accent" />
          {t.fromLibrary}
        </h2>
        {files.length > 0 ? (
          <button type="button" onClick={() => setPicking(true)} disabled={!addable.length} className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3 font-semibold")}>
            <Plus size={15} aria-hidden />
            {t.addFromLibrary}
          </button>
        ) : (
          <Link href="/dashboard/library" className={buttonClass("secondary", "sm", "h-9 px-3")}>
            {t.openLibrary}
          </Link>
        )}
      </div>
      <p className="text-sm text-ink-muted">{files.length ? t.fromLibraryHint(name) : t.libraryEmpty}</p>
      {here.length > 0 && (
        <ul aria-label={t.fromLibrary} className="rounded-md border border-line">
          {here.map((f, i) => {
            const Icon = fileIcon(f.kind, f.name, false);
            return (
              <li key={f.id} className={`flex items-center gap-3 px-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-marker-soft text-marker-ink">
                  <Icon size={16} aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-[15px] font-medium hover:underline">
                      {f.name}
                    </a>
                  ) : (
                    <span className="truncate text-[15px] font-medium">{f.name}</span>
                  )}
                  <span className="text-[13px] text-ink-muted">
                    {formatSize(f.size)}
                    {f.all ? ` · ${t.inAllShort}` : ""}
                  </span>
                </div>
                {!f.all && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await removeFromClassroom(f.id, lessonId);
                        router.refresh();
                      })
                    }
                    aria-label={t.removeFromClassroom(f.name, name)}
                    title={t.removeFromClassroom(f.name, name)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    <X size={16} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {picking && (
        <Portal>
          <FilePicker
            title={t.pickFilesTitle(name)}
            files={addable}
            onClose={() => setPicking(false)}
            onAdd={async (ids) => {
              const done = await addLibraryFiles(lessonId, ids);
              if (!done) router.refresh();
              return done;
            }}
          />
        </Portal>
      )}
    </section>
  );
}

function FilePicker({
  title,
  files,
  onAdd,
  onClose,
}: {
  title: string;
  files: SharedFile[];
  onAdd: (ids: string[]) => Promise<{ error: string } | null>;
  onClose: () => void;
}) {
  const t = useT().library;
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const q = query.trim().toLocaleLowerCase();
  const shown = q ? files.filter((f) => f.name.toLocaleLowerCase().includes(q)) : files;

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("input")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="files-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(640px,92dvh)] w-full max-w-[460px] flex-col gap-3.5 rounded-panel bg-surface p-5 text-ink shadow-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="files-picker-title" className="text-[18px] font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.close} className={buttonClass("ghost", "sm", "h-9 w-9 shrink-0 px-0! text-ink!")}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <label className="relative">
          <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchFiles}
            aria-label={t.searchFiles}
            className="h-10 w-full rounded-md border border-line bg-surface pr-3 pl-9 text-[15px] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          />
        </label>
        <ul className="-mx-1 min-h-[120px] flex-1 overflow-y-auto px-1">
          {shown.map((f) => {
            const Icon = fileIcon(f.kind, f.name, false);
            return (
              <li key={f.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={chosen.has(f.id)}
                    onChange={() =>
                      setChosen((s) => {
                        const n = new Set(s);
                        if (n.has(f.id)) n.delete(f.id);
                        else n.add(f.id);
                        return n;
                      })
                    }
                    className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                  />
                  <Icon size={16} aria-hidden className="shrink-0 text-accent" />
                  <span className="truncate text-[15px]">{f.name}</span>
                </label>
              </li>
            );
          })}
          {!shown.length && <li className="px-2 py-3 text-sm text-ink-muted">{t.noFileMatch}</li>}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t.failed}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" onClick={onClose} className={buttonClass("ghost", "md", "h-11 px-4 text-ink!")}>
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={pending || !chosen.size}
            onClick={() =>
              start(async () => {
                setError(false);
                const done = await onAdd([...chosen]);
                if (done?.error) setError(true);
                else onClose();
              })
            }
            className={buttonClass("primary", "md", "h-11 px-5 font-semibold")}
          >
            {pending ? t.saving : chosen.size ? `${t.add} (${chosen.size})` : t.add}
          </button>
        </div>
      </div>
    </div>
  );
}
