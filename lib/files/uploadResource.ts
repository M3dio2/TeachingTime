import { createClient } from "@/lib/supabase/client";
import { dashboard as enDashboard } from "@/lib/i18n/en/dashboard";

// The messages for the teacher, in her language: pass `t.dashboard.upload` (default English).
export type UploadMessages = typeof enDashboard.upload;

export type ResourceKind = "image" | "pdf" | "audio" | "doc" | "link" | "video" | "text";

// Same limits and types as the "resources" bucket (supabase/migrations/0004–0006, 0010, 0012).
export const MB = 1024 * 1024;
export const MAX_BYTES = 10 * MB; // per file
export const TEACHER_BYTES = 50 * MB; // per teacher, all classrooms together (G1: free plan)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Word files (G2). Old binary .doc files aren't accepted: browsers can't read them.
export const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// F1: videos and text files (supabase/migrations/0016): by extension → type.
export const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
export const TEXT_TYPES: Record<string, string> = { txt: "text/plain" };

export function kindOf(type: string): ResourceKind {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type === DOCX_TYPE) return "doc";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("text/")) return "text";
  return "audio";
}

// How the Classroom page and the lesson's panel group files (F1): one list with filters.
export type FileGroup = "documents" | "pictures" | "videos" | "audio" | "links";
export const FILE_GROUPS: FileGroup[] = ["documents", "pictures", "videos", "audio", "links"];
export function groupOf(kind: ResourceKind, isYouTube = false): FileGroup {
  if (kind === "image") return "pictures";
  if (kind === "video" || (kind === "link" && isYouTube)) return "videos";
  if (kind === "audio") return "audio";
  if (kind === "link") return "links";
  return "documents";
}

// "PDF", "DOCX", "MP4": the extension, for the file's line.
export const extensionLabel = (name: string) => {
  const ext = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "";
  return ext.length <= 5 ? ext : "";
};

// Uploads straight from the browser to Supabase Storage (server actions cap request bodies),
// then adds the file's row. RLS checks both against the teacher's own students (and the
// 200 MB). Returns the new row's id, or a message for the teacher.
export async function uploadResource({
  teacherId,
  lessonId,
  file,
  contentType,
  ext,
  messages = enDashboard.upload,
}: {
  teacherId: string;
  lessonId: string;
  file: Blob & { name: string };
  contentType: string;
  ext: string;
  messages?: UploadMessages;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  // A random object name: the real name (any characters) is kept in the table.
  const path = `${teacherId}/${lessonId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const stored = await supabase.storage.from("resources").upload(path, file, { contentType });
  if (stored.error) {
    console.error("Upload failed", file.name, contentType, stored.error);
    return {
      error: /mime|type/i.test(stored.error.message)
        ? messages.notAccepted(file.name)
        : /row-level security/i.test(stored.error.message)
          ? messages.noRoom(file.name, TEACHER_BYTES / MB)
          : messages.failed(file.name),
    };
  }
  const row = await supabase
    .from("resources")
    .insert({ lesson_id: lessonId, kind: kindOf(contentType), name: file.name, path, size: file.size })
    .select("id")
    .single();
  if (row.error) {
    console.error("Saving the file failed", file.name, row.error);
    await supabase.storage.from("resources").remove([path]);
    return { error: messages.failed(file.name) };
  }
  return { id: row.data.id as string };
}
