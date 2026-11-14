"use client";

import { FileText, FileType2, ImageIcon, Info, Link2, Music, Pause, Play, SquarePlay, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addLink, removeResource } from "@/app/dashboard/actions";
import { LocalDate } from "@/components/dashboard/DashboardBits";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useFormPending } from "@/components/ui/SubmitButton";
import { linkLabel, youtubeId } from "@/lib/room/links";
import { type ResourceKind, useFileUpload } from "./FileUpload";

export type Resource = {
  id: string;
  kind: ResourceKind;
  name: string;
  size: number;
  created_at: string;
  url?: string; // signed, valid for an hour
};

const SECTIONS: { kind: ResourceKind; title: string; filter: string; Icon: LucideIcon }[] = [
  { kind: "image", title: "Pictures", filter: "Pictures", Icon: ImageIcon },
  { kind: "pdf", title: "PDFs", filter: "PDFs", Icon: FileText },
  { kind: "doc", title: "Word files", filter: "Word", Icon: FileType2 },
  { kind: "audio", title: "Audio", filter: "Audio", Icon: Music },
  { kind: "link", title: "Links", filter: "Links", Icon: Link2 },
];

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The classroom's files (docs/design/HANDOFF.md, "Classroom"): header with Upload files, the
// drop area, filters, then Pictures (thumbnails), PDFs and Audio (lists), and a tip.
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
  const [filter, setFilter] = useState<ResourceKind | "all">("all");
  const count = (k: ResourceKind) => files.filter((f) => f.kind === k).length;
  const filters: { id: ResourceKind | "all"; label: string; n: number }[] = [
    { id: "all", label: "All", n: files.length },
    ...SECTIONS.map((s) => ({ id: s.kind, label: s.filter, n: count(s.kind) })),
  ];

  return (
    <section
      aria-labelledby="files"
      className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-panel border border-line bg-surface p-4 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="files" className="font-display text-[26px] font-extrabold tracking-[-0.01em]">
            Files
          </h2>
          <span className="text-sm text-ink-muted">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        </div>
        {upload.button}
      </div>
      {upload.area}

      <div role="group" aria-label="Show" className="flex flex-wrap gap-1 self-start rounded-md bg-surface-2 p-[3px]">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              filter === f.id ? "bg-surface font-semibold text-ink" : "font-medium text-ink-muted hover:text-ink"
            }`}
          >
            {f.label}
            <span className="text-xs text-ink-muted">{f.n}</span>
          </button>
        ))}
      </div>

      {SECTIONS.filter((s) => filter === "all" || filter === s.kind).map(({ kind, title, Icon }) => {
        const list = files.filter((f) => f.kind === kind);
        return (
          <div key={kind} className="flex flex-col gap-2.5">
            <h3 className="text-[15px] font-semibold">{title}</h3>
            {kind === "link" && <AddLink lessonId={lessonId} />}
            {list.length === 0 ? (
              <p className="text-sm text-ink-muted">No {title.toLowerCase()} yet.</p>
            ) : kind === "image" ? (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {list.map((f) => (
                  <li key={f.id} className="flex min-w-0 flex-col gap-1.5">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${f.name}`}
                      className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2 text-ink-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      {f.url ? (
                        // Signed URLs change on every load, so Next's image optimizer wouldn't help.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Icon size={20} aria-hidden />
                      )}
                    </a>
                    <div className="flex items-center gap-1">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{f.name}</span>
                        <Meta file={f} />
                      </div>
                      <DeleteFile file={f} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="rounded-md border border-line">
                {list.map((f, i) => (
                  <li key={f.id} className={`flex items-center gap-3 px-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                    {kind === "audio" ? (
                      <Listen file={f} />
                    ) : (
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                        {kind === "link" && f.url && youtubeId(f.url) ? (
                          <SquarePlay size={16} aria-hidden />
                        ) : (
                          <Icon size={16} aria-hidden />
                        )}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      {f.url && (kind === "pdf" || kind === "doc" || kind === "link") ? (
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
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <p className="flex items-start gap-2.5 rounded-md bg-surface-2 px-3.5 py-3 text-sm leading-snug text-ink-muted">
        <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
        In a lesson, these files sit in the side panel. Click a PDF, Word file, picture or link to show it (YouTube
        videos play for both of you), press play for audio, or drag any file onto the stage.
      </p>
    </section>
  );
}

function Meta({ file }: { file: Resource }) {
  const what =
    file.kind === "link" ? (file.url && youtubeId(file.url) ? "YouTube video" : linkLabel(file.url ?? "").split("/")[0]) : formatSize(file.size);
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
          aria-label="Link to add"
          placeholder="Paste a YouTube video or any link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2000}
          required
          aria-invalid={Boolean(error) || undefined}
          className={`${inputClass(Boolean(error))} min-w-0 flex-1`}
        />
        <Button variant="secondary" disabled={saving || !url.trim()} className="h-11 shrink-0 px-4">
          {saving ? "Adding…" : "Add link"}
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
  return (
    <button
      aria-label={`Delete ${name}`}
      title="Delete"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (!confirm(`Delete ${name}?`)) e.preventDefault();
      }}
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
  useEffect(() => () => audio.current?.pause(), []);
  const label = `${playing ? "Pause" : "Listen to"} ${file.name}`;
  return (
    <button
      type="button"
      aria-label={label}
      title={playing ? "Pause" : "Listen"}
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
