import { createClient } from "@/lib/supabase/client";

export type ResourceKind = "image" | "pdf" | "audio";

// Same limits and types as the "resources" bucket (supabase/migrations/0004–0006).
export const MB = 1024 * 1024;
export const MAX_BYTES = 10 * MB; // per file
export const TEACHER_BYTES = 50 * MB; // per teacher, all classrooms together (G1: free plan)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function kindOf(type: string): ResourceKind {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return "audio";
}

// Uploads straight from the browser to Supabase Storage (server actions cap request bodies),
// then adds the file's row. RLS checks both against the teacher's own students (and the
// 200 MB). Returns the new row's id, or a message for the teacher.
export async function uploadResource({
  teacherId,
  lessonId,
  file,
  contentType,
  ext,
}: {
  teacherId: string;
  lessonId: string;
  file: Blob & { name: string };
  contentType: string;
  ext: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  // A random object name: the real name (any characters) is kept in the table.
  const path = `${teacherId}/${lessonId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const stored = await supabase.storage.from("resources").upload(path, file, { contentType });
  if (stored.error) {
    console.error("Upload failed", file.name, contentType, stored.error);
    return {
      error: /mime|type/i.test(stored.error.message)
        ? `${file.name}: this kind of file isn't accepted yet.`
        : /row-level security/i.test(stored.error.message)
          ? `${file.name} doesn't fit: your files can take up 200 MB. Delete some first.`
          : `${file.name} could not be uploaded. Please try again.`,
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
    return { error: `${file.name} could not be uploaded. Please try again.` };
  }
  return { id: row.data.id as string };
}
