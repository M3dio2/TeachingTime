"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export type ResourceKind = "image" | "pdf" | "audio";

// Same limits and types as the "resources" bucket (supabase/migrations/0004–0006).
const MB = 1024 * 1024;
const MAX_BYTES = 10 * MB; // per file
const TEACHER_BYTES = 200 * MB; // per teacher, all classrooms together
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Browsers sometimes send no type, or a non-standard one such as "image/jpg",
// which the bucket would refuse. The extension decides then.
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  flac: "audio/flac",
  weba: "audio/webm",
};

function contentTypeOf(file: File, ext: string) {
  const known =
    IMAGE_TYPES.includes(file.type) ||
    file.type === "application/pdf" ||
    file.type.startsWith("audio/");
  return known ? file.type : (TYPE_BY_EXT[ext] ?? null);
}

function kindOf(type: string): ResourceKind {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return "audio";
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
  lessonId: string;
  usedBytes: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function upload(files: File[]) {
    setError("");
    const supabase = createClient();
    const failed: string[] = [];
    let used = usedBytes;

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
      const contentType = contentTypeOf(file, ext);
      if (!contentType) {
        failed.push(`${file.name} is not a picture, PDF or audio file.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        failed.push(`${file.name} is bigger than 10 MB.`);
        continue;
      }
      if (used + file.size > TEACHER_BYTES) {
        failed.push(`${file.name} doesn't fit: your files can take up 200 MB. Delete some first.`);
        continue;
      }

      setBusy(`Uploading ${file.name}…`);
      // A random object name: the real name (any characters) is kept in the table.
      const path = `${teacherId}/${lessonId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const stored = await supabase.storage.from("resources").upload(path, file, { contentType });
      if (stored.error) {
        console.error("Upload failed", file.name, contentType, stored.error);
        failed.push(
          /mime|type/i.test(stored.error.message)
            ? `${file.name}: this kind of file isn't accepted yet.`
            : /row-level security/i.test(stored.error.message)
              ? `${file.name} doesn't fit: your files can take up 200 MB. Delete some first.`
              : `${file.name} could not be uploaded. Please try again.`,
        );
        continue;
      }
      const row = await supabase
        .from("resources")
        .insert({ lesson_id: lessonId, kind: kindOf(contentType), name: file.name, path, size: file.size });
      if (row.error) {
        console.error("Saving the file failed", file.name, row.error);
        await supabase.storage.from("resources").remove([path]);
        failed.push(`${file.name} could not be uploaded. Please try again.`);
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
    // "Upload files" (the header button).
    button: (
      <Button
        variant="secondary"
        disabled={!!busy}
        onClick={pick}
        className="h-11 w-full font-semibold md:h-10 md:w-auto"
      >
        <Upload size={16} aria-hidden />
        Upload files
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
            <span className="font-semibold">{over ? "Drop to upload" : "Drop files here"}</span>
            <span className="text-[13px] text-ink-muted">Pictures, PDFs or audio, up to 10 MB each</span>
          </div>
        </div>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {busy}
        </p>
        <input
          ref={input}
          type="file"
          accept={[...IMAGE_TYPES, "application/pdf", "audio/*", ".jpg,.jpeg,.png,.webp,.gif,.pdf"].join(",")}
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

// "38 MB of 200 MB" with a bar: all the teacher's classrooms together.
export function StorageCard({ usedBytes }: { usedBytes: number }) {
  const used = Math.ceil(usedBytes / MB);
  const pct = Math.min(100, (usedBytes / TEACHER_BYTES) * 100);
  return (
    <section className="flex flex-col gap-2.5 rounded-panel border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">Storage</span>
        <span className="text-sm text-ink-muted tabular-nums">{used} MB of 200 MB</span>
      </div>
      <div role="img" aria-label={`${used} of 200 MB used`} className="h-2 overflow-hidden rounded bg-surface-2">
        <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[13px] leading-snug text-ink-muted">All your classrooms together. Up to 10 MB per file.</span>
    </section>
  );
}
