"use client";

import { School, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addFilesToClassrooms, deleteLibraryFiles, setFileClassrooms } from "@/app/(app)/dashboard/library/actions";
import CloudPick from "@/components/cloud/CloudPick";
import { formatSize } from "@/components/classroom/ClassroomFiles";
import { useFileUpload } from "@/components/classroom/FileUpload";
import { LocalDate } from "@/components/dashboard/DashboardBits";
import { fileIcon } from "@/components/files/fileIcon";
import { buttonClass } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { extensionLabel, FILE_GROUPS, type FileGroup, groupOf, type ResourceKind } from "@/lib/files/uploadResource";
import { useT } from "@/lib/i18n/client";
import Portal from "@/components/ui/Portal";
import ClassroomPicker, { type PickClassroom } from "./ClassroomPicker";

export type LibraryFile = {
  id: string;
  kind: ResourceKind;
  name: string;
  size: number;
  created_at: string;
  url?: string;
  all: boolean;
  lessonIds: string[];
};

// The Library page's list (mock-up 8): upload, filters, one row per file with where it is
// ("In all Classrooms", "In 3 of 12") and the Classrooms picker; tick several files to add
// them to Classrooms together or delete them.
export default function LibraryFiles({
  files,
  classrooms,
  teacherId,
  usedBytes,
}: {
  files: LibraryFile[];
  classrooms: PickClassroom[];
  teacherId: string;
  usedBytes: number;
}) {
  const t = useT().library;
  const td = useT().dashboard;
  const router = useRouter();
  const ask = useConfirm();
  const upload = useFileUpload({ teacherId, lessonId: null, usedBytes });
  const [filter, setFilter] = useState<FileGroup | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState<LibraryFile | "selection" | null>(null);
  const [pending, start] = useTransition();
  const present = FILE_GROUPS.filter((g) => files.some((f) => groupOf(f.kind) === g));
  const shownFilter = filter !== "all" && present.includes(filter) ? filter : "all";
  const list = shownFilter === "all" ? files : files.filter((f) => groupOf(f.kind) === shownFilter);
  const chosen = files.filter((f) => selected.has(f.id));
  const allShownSelected = list.length > 0 && list.every((f) => selected.has(f.id));

  const where = (f: LibraryFile) =>
    f.all ? t.inAll : f.lessonIds.length ? t.inSome(f.lessonIds.filter((id) => classrooms.some((c) => c.id === id)).length, classrooms.length) : t.inNone;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const remove = async (ids: string[], message: string) => {
    if (!(await ask({ message, detail: t.deleteDetail, confirmLabel: td.delete }))) return;
    start(async () => {
      await deleteLibraryFiles(ids);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <section aria-labelledby="library-files" className="flex flex-col gap-5 rounded-panel border border-line bg-surface p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="library-files" className="font-display text-[26px] font-extrabold tracking-[-0.01em]">
            {td.files}
          </h2>
          <span className="text-sm text-ink-muted">{td.fileCount(files.length)}</span>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          {upload.button}
          <CloudPick upload={upload.upload} busy={upload.busy} setBusy={upload.setBusy} setError={upload.setError} />
        </div>
      </div>
      {upload.area}

      {files.length === 0 ? (
        <p className="text-sm text-ink-muted">{t.empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {present.length > 1 ? (
              <div role="group" aria-label={td.show} className="flex flex-wrap gap-1 rounded-md bg-surface-2 p-[3px]">
                {[{ id: "all" as const, label: td.all, n: files.length }, ...present.map((g) => ({ id: g, label: td.groups[g], n: files.filter((f) => groupOf(f.kind) === g).length }))].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={shownFilter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      shownFilter === f.id ? "bg-surface font-semibold text-ink" : "font-medium text-ink-muted hover:text-ink"
                    }`}
                  >
                    {f.label}
                    <span className="text-xs text-ink-muted">{f.n}</span>
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={allShownSelected}
                onChange={() => setSelected(allShownSelected ? new Set() : new Set(list.map((f) => f.id)))}
                className="h-4.5 w-4.5 accent-[var(--color-accent)]"
              />
              {t.selectAllFiles}
            </label>
          </div>

          {chosen.length > 0 && (
            <div role="region" aria-label={t.filesSelected(chosen.length)} className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-panel border border-ink bg-marker-soft px-3.5 py-2.5 shadow-[3px_3px_0_var(--color-marker)]">
              <span className="mr-auto font-semibold text-marker-ink">{t.filesSelected(chosen.length)}</span>
              <button type="button" onClick={() => setPicking("selection")} className={buttonClass("primary", "sm", "h-9 gap-1.5 px-3 font-semibold")}>
                <School size={15} aria-hidden />
                {t.addToClassrooms}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(chosen.map((f) => f.id), t.deleteSelectedConfirm(chosen.length))}
                className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3 text-danger!")}
              >
                <Trash2 size={15} aria-hidden />
                {t.deleteSelected}
              </button>
              <button type="button" onClick={() => setSelected(new Set())} aria-label={t.clearSelection} title={t.clearSelection} className={buttonClass("ghost", "sm", "h-9 w-9 px-0! text-ink!")}>
                <X size={16} aria-hidden />
              </button>
            </div>
          )}

          <ul aria-label={t.title} className="rounded-md border border-line">
            {list.map((f, i) => {
              const Icon = fileIcon(f.kind, f.name, false);
              const type = f.kind === "image" || f.kind === "video" || f.kind === "audio" ? td.kindLabels[f.kind] : extensionLabel(f.name);
              return (
                <li key={f.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 ${i ? "border-t border-line" : ""} ${selected.has(f.id) ? "bg-marker-soft/40" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(f.id)}
                    onChange={() => toggle(f.id)}
                    aria-label={t.selectFile(f.name)}
                    className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                    <Icon size={16} aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-[1_1_220px] flex-col">
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-[15px] font-medium hover:underline">
                        {f.name}
                      </a>
                    ) : (
                      <span className="truncate text-[15px] font-medium">{f.name}</span>
                    )}
                    <span className="truncate text-[13px] text-ink-muted">
                      {[type, formatSize(f.size)].filter(Boolean).join(" · ")} · <LocalDate iso={f.created_at} />
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPicking(f)}
                    aria-label={t.chooseFor(f.name)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      f.all || f.lessonIds.length ? "border-line bg-surface-2 text-ink hover:border-ink-muted" : "border-marker bg-marker-soft text-marker-ink"
                    }`}
                  >
                    <School size={14} aria-hidden />
                    {where(f)}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove([f.id], t.deleteConfirm(f.name))}
                    aria-label={t.deleteFile(f.name)}
                    title={td.delete}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {picking && (
        <Portal>
          <ClassroomPicker
            title={picking === "selection" ? t.nFiles(chosen.length) : picking.name}
            classrooms={classrooms}
            initialAll={picking !== "selection" && picking.all}
            initial={picking === "selection" ? [] : picking.lessonIds}
            addOnly={picking === "selection"}
            onSave={async (all, ids) => {
              const done =
                picking === "selection"
                  ? await addFilesToClassrooms(chosen.map((f) => f.id), all, ids)
                  : await setFileClassrooms(picking.id, all, ids);
              if (!done) {
                if (picking === "selection") setSelected(new Set());
                router.refresh();
              }
              return done;
            }}
            onClose={() => setPicking(null)}
          />
        </Portal>
      )}
    </section>
  );
}
