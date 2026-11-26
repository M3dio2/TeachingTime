"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Review A5: the lesson's text pad as a dated note. One note per Classroom and day (0020):
// leaving and rejoining, or saving again, updates that day's note. `day` is the teacher's own
// date ("2026-11-26"). Returns false if it couldn't be saved.
export async function saveLessonNote(lessonId: string, body: string, day?: string): Promise<boolean> {
  const text = body.trim().slice(0, 50000);
  if (!text) return true;
  const lessonDate = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: today } = await supabase
    .from("lesson_notes")
    .select("id, body")
    .eq("lesson_id", lessonId)
    .eq("lesson_date", lessonDate)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (today?.body === text) return true;
  // The pad unchanged since an earlier lesson's note: nothing new to keep.
  if (!today) {
    const { data: previous } = await supabase
      .from("lesson_notes")
      .select("body")
      .eq("lesson_id", lessonId)
      .order("lesson_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previous?.body === text) return true;
  }
  const { error } = today
    ? await supabase.from("lesson_notes").update({ body: text, updated_at: new Date().toISOString() }).eq("id", today.id)
    : await supabase.from("lesson_notes").insert({ lesson_id: lessonId, body: text, lesson_date: lessonDate });
  // Two saves at once (leaving and hiding the tab): the second finds the first's note.
  if (error?.code === "23505") return saveLessonNote(lessonId, body, lessonDate);
  if (error) console.error("lesson_notes:", error.message);
  return !error;
}

export async function deleteLessonNote(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("lesson_notes").delete().eq("id", id);
  revalidatePath(`/dashboard/${lessonId}`);
}
