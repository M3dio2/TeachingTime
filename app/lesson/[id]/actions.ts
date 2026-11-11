"use server";

import { closeRoom } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";

// Ends the lesson's call for both (the teacher's room does this after 3 hours, lib/limits.ts).
// RLS: only the lesson's own teacher finds the row, so nobody can end someone else's call.
export async function endLessonCall(lessonId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("id").eq("id", lessonId).maybeSingle();
  if (data) await closeRoom(data.id);
}
