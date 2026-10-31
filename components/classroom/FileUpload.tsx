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
// Each file is sorted into Pictures, PDFs or Audio by its type.
export default function FileUpload({
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={!!busy} onClick={() => input.current?.click()}>
          <Upload size={16} aria-hidden />
          Upload files
        </Button>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {busy || "Pictures, PDFs or audio, up to 10 MB each."}
        </p>
      </div>
      <p className="text-sm text-ink-muted">
        {Math.ceil(usedBytes / MB)} MB of your 200 MB used, all classrooms together.
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
  );
}
