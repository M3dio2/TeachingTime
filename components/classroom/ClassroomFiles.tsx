"use client";

import { Info, Library as LibraryIcon, Pause, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { addLink, removeResource } from "@/app/(app)/dashboard/actions";
import { moveToLibrary } from "@/app/(app)/dashboard/library/actions";
import { LocalDate } from "@/components/dashboard/DashboardBits";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useConfirmSubmit } from "@/components/ui/Confirm";
import { useFormPending } from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/lib/i18n/client";
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
  lessonDays = [],
  nextLessonAt = null,
  library,
}: {
  files: Resource[];
  teacherId: string;
  lessonId: string;
  usedBytes: number;
  lessonDays?: string[]; // when lessons took place (ISO): one section per lesson
  nextLessonAt?: string | null; // the next planned lesson (calendar)
  library?: React.ReactNode; // the Library files this Classroom has, shown first
}) {
  const upload = useFileUpload({ teacherId, lessonId, usedBytes });
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false); // days in her zone
  const locale = useLocale();
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
      {library}

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
          {(() => {
            const sections = groupByLesson(list, lessonDays, nextLessonAt, mounted, locale);
            const shown = sections.slice(0, OPEN_SECTIONS);
            const older = sections.slice(OPEN_SECTIONS);
            return (
              <>
                {shown.map((sec) => (
                  <div key={sec.key} className="flex flex-col gap-1.5">
                    <SectionHead s={sec} />
                    <SectionList s={sec} />
                  </div>
                ))}
                {older.length > 0 && (
                  <details className="group flex flex-col gap-3">
                    <summary className="cursor-pointer list-none rounded-md px-1 py-1.5 text-sm font-semibold text-accent hover:underline">
                      {t.earlierLessons(older.length)}
                    </summary>
                    <div className="mt-3 flex flex-col gap-4">
                      {older.map((sec) => (
                        <div key={sec.key} className="flex flex-col gap-1.5">
                          <SectionHead s={sec} />
                          <SectionList s={sec} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            );
          })()}
        </>
      )}

      <p className="flex items-start gap-2.5 rounded-md bg-surface-2 px-3.5 py-3 text-sm leading-snug text-ink-muted">
        <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
        {t.filesTip}
      </p>
    </section>
  );
}

function FileRow({ file: f, first }: { file: Resource; first: boolean }) {
  const t = useT().dashboard;
  const icon = createElement(fileIcon(f.kind, f.name, isYouTube(f)), { size: 16, "aria-hidden": true });
  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 ${first ? "" : "border-t border-line"}`}>
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
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">{icon}</span>
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
      {f.kind !== "link" && <MoveToLibrary file={f} />}
      <DeleteFile file={f} />
    </li>
  );
}

const noopSubscribe = () => () => {};

type Section = { key: string; label: string | null; kind: "next" | "lesson" | "all"; files: Resource[] };

// One section per lesson (user, Nov 2026): a file belongs to the lesson it was added for, i.e.
// the first lesson on or after the day it was uploaded (prepared before, or used during it).
// Files since the last lesson are "for the next lesson" (with its planned day, if any), on top;
// then the lessons, newest first. Before the browser's time zone is known: one list.
function groupByLesson(files: Resource[], lessonDays: string[], nextAt: string | null, ready: boolean, locale: string): Section[] {
  if (!ready || (!lessonDays.length && !nextAt)) return [{ key: "all", label: null, kind: "all", files }];
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const label = (d: Date) =>
    d.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
  const lessons = [...new Map(lessonDays.map((iso) => [day(new Date(iso)), new Date(iso)])).entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const next: Section = { key: "next", label: nextAt ? label(new Date(nextAt)) : "", kind: "next", files: [] };
  const byLesson = new Map<string, Section>();
  for (const f of files) {
    const d = day(new Date(f.created_at));
    const hit = lessons.find(([k]) => k >= d);
    if (!hit) {
      next.files.push(f);
      continue;
    }
    const s = byLesson.get(hit[0]) ?? { key: hit[0], label: label(hit[1]), kind: "lesson" as const, files: [] };
    s.files.push(f);
    byLesson.set(hit[0], s);
  }
  const past = [...byLesson.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  return [...(next.files.length ? [next] : []), ...past];
}

// Older lessons fold away so the list stays short.
const OPEN_SECTIONS = 3;

function SectionHead({ s }: { s: Section }) {
  const t = useT().dashboard;
  if (s.label === null) return null;
  return (
    <h3 className="flex items-baseline gap-2 text-[13px] font-bold tracking-[0.04em] text-ink-muted uppercase" data-testid="files-day">
      {s.kind === "next" ? t.filesForNext(s.label) : t.filesFromLesson(s.label)}
      <span className="font-medium tracking-normal normal-case">· {t.fileCount(s.files.length)}</span>
    </h3>
  );
}

function SectionList({ s }: { s: Section }) {
  const t = useT().dashboard;
  return (
    <ul aria-label={s.label === null ? t.files : `${t.files}: ${s.label}`} className="rounded-md border border-line">
      {s.files.map((f, i) => (
        <FileRow key={f.id} file={f} first={i === 0} />
      ))}
    </ul>
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

// A Classroom's own file → the Library (0019); it stays in this Classroom.
function MoveToLibrary({ file }: { file: Resource }) {
  const t = useT().library;
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={t.moveToLibraryTitle(file.name)}
      title={t.moveToLibraryTitle(file.name)}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await moveToLibrary(file.id);
          router.refresh();
        })
      }
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:animate-pulse"
    >
      <LibraryIcon size={16} aria-hidden />
    </button>
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
