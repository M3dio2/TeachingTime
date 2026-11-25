"use client";

import { Info, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addLink, removeResource } from "@/app/(app)/dashboard/actions";
import { LocalDate } from "@/components/dashboard/DashboardBits";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useConfirmSubmit } from "@/components/ui/Confirm";
import { useFormPending } from "@/components/ui/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { linkLabel, youtubeId } from "@/lib/room/links";
import CloudPick from "@/components/cloud/CloudPick";
import { fileIcon } from "@/components/files/fileIcon";
import { extensionLabel, FILE_GROUPS, type FileGroup, groupOf } from "@/lib/files/uploadResource";
import { type ResourceKind, useFileUpload } from "./FileUpload";

export type Resource = {
  id: string;
  kind: ResourceKind;
  name: string;
  size: number;
  created_at: string;
  url?: string; // signed, valid for an hour
};

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isYouTube = (f: Resource) => f.kind === "link" && !!f.url && !!youtubeId(f.url);

// The classroom's files (F1): header with Upload files (and the clouds), the drop area, a
// link field, filters by group (only the groups that have files), then one list, newest first.
// Any kind of file sits in the same list; its icon and type label tell them apart.
export default function ClassroomFiles({
  files,
  teacherId,
  lessonId,
  usedBytes,
}: {
  files: Resource[];
  teacherId: string;
  lessonId: string;
  usedBytes: number;
}) {
  const upload = useFileUpload({ teacherId, lessonId, usedBytes });
  const t = useT().dashboard;
  const [filter, setFilter] = useState<FileGroup | "all">("all");
  const group = (f: Resource) => groupOf(f.kind, isYouTube(f));
  const present = FILE_GROUPS.filter((g) => files.some((f) => group(f) === g));
  // A filter whose last file was deleted falls back to All.
  const shownFilter = filter !== "all" && present.includes(filter) ? filter : "all";
  const list = shownFilter === "all" ? files : files.filter((f) => group(f) === shownFilter);
  const filters: { id: FileGroup | "all"; label: string; n: number }[] = [
    { id: "all", label: t.all, n: files.length },
    ...present.map((g) => ({ id: g, label: t.groups[g], n: files.filter((f) => group(f) === g).length })),
  ];

  return (
    <section
      aria-labelledby="files"
      className="flex min-w-0 flex-1 flex-col gap-5 rounded-panel border border-line bg-surface p-4 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="files" className="font-display text-[26px] font-extrabold tracking-[-0.01em]">
            {t.files}
          </h2>
          <span className="text-sm text-ink-muted">{t.fileCount(files.length)}</span>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          {upload.button}
          <CloudPick upload={upload.upload} busy={upload.busy} setBusy={upload.setBusy} setError={upload.setError} />
        </div>
      </div>
      {upload.area}
      <AddLink lessonId={lessonId} />

      {files.length === 0 ? (
        <p className="text-sm text-ink-muted">{t.noFiles}</p>
      ) : (
        <>
          {present.length > 1 && (
            <div role="group" aria-label={t.show} className="flex flex-wrap gap-1 self-start rounded-md bg-surface-2 p-[3px]">
              {filters.map((f) => (
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
          )}
          <ul aria-label={t.files} className="rounded-md border border-line">
            {list.map((f, i) => {
              const Icon = fileIcon(f.kind, f.name, isYouTube(f));
              return (
                <li key={f.id} className={`flex items-center gap-3 px-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                  {f.kind === "audio" ? (
                    <Listen file={f} />
                  ) : f.kind === "image" && f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t.openFile(f.name)}
                      className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      {/* Signed URLs change on every load, so Next's image optimizer wouldn't help. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </a>
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                      <Icon size={16} aria-hidden />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    {f.url && f.kind !== "audio" ? (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[15px] font-medium hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                      >
                        {f.name}
                      </a>
                    ) : (
                      <span className="truncate text-[15px] font-medium">{f.name}</span>
                    )}
                    <Meta file={f} />
                  </div>
                  <DeleteFile file={f} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="flex items-start gap-2.5 rounded-md bg-surface-2 px-3.5 py-3 text-sm leading-snug text-ink-muted">
        <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
        {t.filesTip}
      </p>
    </section>
  );
}

// "PDF · 1.2 MB · Mon, Nov 23", "Picture · 300 KB · …", "YouTube video · …".
function Meta({ file }: { file: Resource }) {
  const t = useT().dashboard;
  const type =
    file.kind === "image" || file.kind === "video" || file.kind === "audio" ? t.kindLabels[file.kind] : extensionLabel(file.name);
  const what =
    file.kind === "link"
      ? file.url && youtubeId(file.url)
        ? t.youtubeVideo
        : linkLabel(file.url ?? "").split("/")[0]
      : [type, formatSize(file.size)].filter(Boolean).join(" · ");
  return (
    <span className="truncate text-[13px] text-ink-muted">
      {what} · <LocalDate iso={file.created_at} />
    </span>
  );
}

// "Add a link": paste a YouTube video or any web page. YouTube links are named after the video.
function AddLink({ lessonId }: { lessonId: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useT().dashboard;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const problem = await addLink(lessonId, url, "");
        setSaving(false);
        if (problem) setError(problem);
        else setUrl("");
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="url"
          aria-label={t.linkToAdd}
          placeholder={t.linkPlaceholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2000}
          required
          aria-invalid={Boolean(error) || undefined}
          className={`${inputClass(Boolean(error))} min-w-0 flex-1`}
        />
        <Button variant="secondary" disabled={saving || !url.trim()} className="h-11 shrink-0 px-4">
          {saving ? t.adding : t.addLink}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function DeleteFile({ file }: { file: Resource }) {
  return (
    <form action={removeResource}>
      <input type="hidden" name="id" value={file.id} />
      <DeleteFileButton name={file.name} />
    </form>
  );
}

function DeleteFileButton({ name }: { name: string }) {
  const pending = useFormPending();
  const t = useT().dashboard;
  const tc = useT().common;
  const confirmSubmit = useConfirmSubmit();
  return (
    <button
      aria-label={t.deleteName(name)}
      title={t.delete}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(e) => confirmSubmit(e, { message: t.deleteConfirm(name), confirmLabel: tc.delete })}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:animate-pulse"
    >
      <Trash2 size={16} aria-hidden />
    </button>
  );
}

// Listen before a lesson: plays only here, for the teacher.
function Listen({ file }: { file: Resource }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const t = useT().dashboard;
  useEffect(() => () => audio.current?.pause(), []);
  const label = playing ? t.pauseName(file.name) : t.listenTo(file.name);
  return (
    <button
      type="button"
      aria-label={label}
      title={playing ? t.pause : t.listen}
      disabled={!file.url}
      onClick={() => {
        audio.current ??= Object.assign(new Audio(file.url), { onended: () => setPlaying(false) });
        if (playing) {
          audio.current.pause();
          setPlaying(false);
        } else {
          audio.current.play().then(() => setPlaying(true), () => setPlaying(false));
        }
      }}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
        playing ? "bg-accent text-white" : "bg-surface-2 text-accent hover:bg-line"
      }`}
    >
      {playing ? <Pause size={12} fill="currentColor" aria-hidden /> : <Play size={12} fill="currentColor" aria-hidden />}
    </button>
  );
}
