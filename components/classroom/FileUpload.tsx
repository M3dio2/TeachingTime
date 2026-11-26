"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import {
  DOCX_TYPE,
  IMAGE_TYPES,
  LIBRARY_MAX_BYTES,
  MAX_BYTES,
  MB,
  TEXT_TYPES,
  VIDEO_TYPES,
  type ResourceKind,
  TEACHER_BYTES,
  uploadResource,
} from "@/lib/files/uploadResource";
import { useT } from "@/lib/i18n/client";

export type { ResourceKind };

// Browsers sometimes send no type, or a non-standard one such as "image/jpg",
// which the bucket would refuse. The extension decides then.
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  docx: DOCX_TYPE,
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  flac: "audio/flac",
  weba: "audio/webm",
  ...VIDEO_TYPES,
  ...TEXT_TYPES,
};
const ACCEPTED = new Set(Object.values(TYPE_BY_EXT));

function contentTypeOf(file: File, ext: string) {
  // The extension first: browsers name the same file differently (e.g. .csv as
  // "application/vnd.ms-excel", .md as ""), and the bucket only takes the types on its list.
  if (TYPE_BY_EXT[ext]) return TYPE_BY_EXT[ext];
  const known = IMAGE_TYPES.includes(file.type) || file.type.startsWith("audio/") || ACCEPTED.has(file.type);
  return known ? file.type : null;
}

// Uploads straight from the browser to Supabase Storage (server actions cap request bodies),
// then adds the file's row. RLS checks both against the teacher's own students.
// Each file is sorted into Pictures, PDFs or Audio by its type. Returns the header button and
// the drop area (with the messages), which sit in different places.
export function useFileUpload({
  teacherId,
  lessonId,
  usedBytes,
}: {
  teacherId: string;
  lessonId: string | null; // null: the Library, with bigger files
  usedBytes: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const t = useT().dashboard;
  const tl = useT().library;

  async function upload(files: File[]) {
    setError("");
    const failed: string[] = [];
    let used = usedBytes;

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
      const contentType = contentTypeOf(file, ext);
      if (ext === "doc") {
        failed.push(t.upload.oldWord(file.name));
        continue;
      }
      // Presentations: as a PDF they work in the lesson (pages, writing on them, in sync).
      if (["pptx", "ppt", "key", "odp", "pps", "ppsx"].includes(ext)) {
        failed.push(t.upload.presentation(file.name));
        continue;
      }
      if (!contentType) {
        failed.push(t.upload.wrongType(file.name));
        continue;
      }
      if (file.size > (lessonId ? MAX_BYTES : LIBRARY_MAX_BYTES)) {
        failed.push(lessonId ? t.upload.tooBig(file.name) : tl.tooBig(file.name, LIBRARY_MAX_BYTES / MB));
        continue;
      }
      if (used + file.size > TEACHER_BYTES) {
        failed.push(t.upload.noRoom(file.name, TEACHER_BYTES / MB));
        continue;
      }

      setBusy(t.uploading(file.name));
      const done = await uploadResource({ teacherId, lessonId, file, contentType, ext, messages: t.upload });
      if ("error" in done) {
        failed.push(done.error);
        continue;
      }
      used += file.size;
    }

    setBusy("");
    setError(failed.join(" "));
    router.refresh();
  }

  const pick = () => input.current?.click();
  const [over, setOver] = useState(false);

  return {
    busy,
    pick,
    upload, // C1: files fetched from a cloud go the same way
    setBusy,
    setError,
    // "Upload files" (the header button).
    button: (
      <Button
        variant="secondary"
        disabled={!!busy}
        onClick={pick}
        className="h-11 w-full font-semibold md:h-10 md:w-auto"
      >
        <Upload size={16} aria-hidden />
        {t.uploadFiles}
      </Button>
    ),
    // The drop area (desktop) and the upload messages; files dropped here use the same code.
    area: (
      <div className="flex flex-col gap-2">
        <div
          data-testid="drop-area"
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length) upload(files);
          }}
          className={`hidden flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-panel border-[1.5px] border-dashed p-[22px] text-center md:flex ${
            over ? "border-accent bg-surface-2" : "border-ink-muted bg-paper"
          }`}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent">
            <Upload size={18} aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-semibold">{over ? t.dropToUpload : t.dropFilesHere}</span>
            <span className="text-[13px] text-ink-muted">{lessonId ? t.dropHint : tl.dropHint(LIBRARY_MAX_BYTES / MB)}</span>
          </div>
        </div>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {busy}
        </p>
        <input
          ref={input}
          type="file"
          accept={[...IMAGE_TYPES, "application/pdf", DOCX_TYPE, "audio/*", "video/*", ...Object.keys(TYPE_BY_EXT).map((e) => `.${e}`)].join(",")}
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = ""; // so the same file can be picked again
            if (files.length) upload(files);
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    ),
  };
}

// "38 MB of 50 MB" with a bar: all the teacher's classrooms together.
export function StorageCard({ usedBytes }: { usedBytes: number }) {
  const t = useT().dashboard;
  const used = Math.ceil(usedBytes / MB);
  const pct = Math.min(100, (usedBytes / TEACHER_BYTES) * 100);
  return (
    <section className="flex flex-col gap-2.5 rounded-panel border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{t.storage}</span>
        <span className="text-sm text-ink-muted tabular-nums">{t.storageUsed(used, TEACHER_BYTES / MB)}</span>
      </div>
      <div role="img" aria-label={t.storageUsedLabel(used, TEACHER_BYTES / MB)} className="h-2 overflow-hidden rounded bg-surface-2">
        <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[13px] leading-snug text-ink-muted">{t.storageHint}</span>
    </section>
  );
}
