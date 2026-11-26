"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Review A5: the lesson's text pad as a dated note. One note per lesson: a save within 3 hours
// of the note's first save updates it (the pad is kept that long too), later ones start a new
// note. Returns false if it couldn't be saved.
const SAME_LESSON_MS = 3 * 60 * 60 * 1000;

export async function saveLessonNote(lessonId: string, body: string): Promise<boolean> {
  const text = body.trim().slice(0, 50000);
  if (!text) return true;
  const supabase = await createClient();
  const since = new Date(Date.now() - SAME_LESSON_MS).toISOString();
  const { data: recent } = await supabase
    .from("lesson_notes")
    .select("id")
    .eq("lesson_id", lessonId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = recent
    ? await supabase.from("lesson_notes").update({ body: text, updated_at: new Date().toISOString() }).eq("id", recent.id)
    : await supabase.from("lesson_notes").insert({ lesson_id: lessonId, body: text });
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
