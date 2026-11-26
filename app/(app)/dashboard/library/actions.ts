"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The Library (migration 0019). RLS keeps every row to the teacher's own files and Classrooms.
type Result = { error: string } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ids = (list: string[]) => list.filter((x) => UUID.test(x)).slice(0, 500);

function refresh(lessonIds: string[] = []) {
  revalidatePath("/dashboard/library");
  for (const id of lessonIds.slice(0, 50)) revalidatePath(`/dashboard/${id}`);
}

// One file: exactly these Classrooms (or all of them).
export async function setFileClassrooms(fileId: string, all: boolean, lessonIds: string[]): Promise<Result> {
  if (!UUID.test(fileId)) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("resources").update({ all_classrooms: all }).eq("id", fileId).eq("in_library", true);
  if (error) return { error: "failed" };
  const { data: before } = await supabase.from("resource_classrooms").select("lesson_id").eq("resource_id", fileId);
  const now = new Set(all ? [] : ids(lessonIds));
  const old = new Set((before ?? []).map((r) => r.lesson_id as string));
  const gone = [...old].filter((id) => !now.has(id));
  const added = [...now].filter((id) => !old.has(id));
  if (gone.length) await supabase.from("resource_classrooms").delete().eq("resource_id", fileId).in("lesson_id", gone);
  if (added.length) {
    const { error: e2 } = await supabase.from("resource_classrooms").insert(added.map((lesson_id) => ({ resource_id: fileId, lesson_id })));
    if (e2) return { error: "failed" };
  }
  refresh([...gone, ...added]);
  return null;
}

// Several files: add these Classrooms (keeps the ones they're in), or make them "all".
export async function addFilesToClassrooms(fileIds: string[], all: boolean, lessonIds: string[]): Promise<Result> {
  const files = ids(fileIds);
  if (!files.length) return null;
  const supabase = await createClient();
  if (all) {
    const { error } = await supabase.from("resources").update({ all_classrooms: true }).in("id", files).eq("in_library", true);
    if (error) return { error: "failed" };
    await supabase.from("resource_classrooms").delete().in("resource_id", files);
  } else {
    const rows = files.flatMap((resource_id) => ids(lessonIds).map((lesson_id) => ({ resource_id, lesson_id })));
    if (rows.length) {
      const { error } = await supabase.from("resource_classrooms").upsert(rows, { ignoreDuplicates: true });
      if (error) return { error: "failed" };
    }
  }
  refresh(lessonIds);
  return null;
}

// A Classroom page: add Library files to this Classroom / take one out.
export async function addLibraryFiles(lessonId: string, fileIds: string[]): Promise<Result> {
  return addFilesToClassrooms(fileIds, false, [lessonId]);
}

export async function removeFromClassroom(fileId: string, lessonId: string): Promise<Result> {
  if (!UUID.test(fileId) || !UUID.test(lessonId)) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("resource_classrooms").delete().eq("resource_id", fileId).eq("lesson_id", lessonId);
  if (error) return { error: "failed" };
  refresh([lessonId]);
  return null;
}

// Delete Library files: the stored files, then the rows (their Classroom links go with them).
export async function deleteLibraryFiles(fileIds: string[]): Promise<Result> {
  const files = ids(fileIds);
  if (!files.length) return null;
  const supabase = await createClient();
  const { data: rows } = await supabase.from("resources").select("id, path").in("id", files).eq("in_library", true);
  const paths = (rows ?? []).map((r) => r.path as string | null).filter((p): p is string => Boolean(p));
  if (paths.length) {
    const { error } = await supabase.storage.from("resources").remove(paths);
    if (error) return { error: "failed" };
  }
  const { error } = await supabase.from("resources").delete().in("id", (rows ?? []).map((r) => r.id));
  if (error) return { error: "failed" };
  refresh();
  return null;
}

// A Classroom's own file → the Library (it stays in that Classroom). The stored file moves to
// the Library folder so the paths keep saying whose it is.
export async function moveToLibrary(fileId: string): Promise<Result> {
  if (!UUID.test(fileId)) return { error: "invalid" };
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("resources")
    .select("id, lesson_id, path, teacher_id, in_library")
    .eq("id", fileId)
    .maybeSingle();
  if (!file || file.in_library || !file.lesson_id) return { error: "failed" };
  let path = file.path as string | null;
  if (path) {
    const to = `${file.teacher_id}/library/${path.split("/").pop()}`;
    const { error } = await supabase.storage.from("resources").move(path, to);
    if (error) {
      console.error("moveToLibrary:", error.message);
      return { error: "failed" };
    }
    path = to;
  }
  const { error } = await supabase
    .from("resources")
    .update({ in_library: true, lesson_id: null, path })
    .eq("id", file.id);
  if (error) {
    console.error("moveToLibrary row:", error.message);
    if (path && file.path) await supabase.storage.from("resources").move(path, file.path);
    return { error: "failed" };
  }
  await supabase.from("resource_classrooms").insert({ resource_id: file.id, lesson_id: file.lesson_id });
  refresh([file.lesson_id]);
  return null;
}
