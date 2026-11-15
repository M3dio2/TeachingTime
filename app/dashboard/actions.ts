"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_CLASSROOMS } from "@/lib/limits";
import { linkLabel, normalizeUrl, youtubeId } from "@/lib/room/links";
import { closeRoom } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";

// Short, unguessable invite code for the student link.
function newSlug() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

// A regular student: fixed invite link, board kept until their next lesson.
export async function addStudent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("kind", "student");
  if ((count ?? 0) >= MAX_CLASSROOMS) return; // the dashboard says why; the database refuses too
  const { error } = await supabase.from("lessons").insert({ title, invite_slug: newSlug() });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// Deletes the teacher's quick calls (all, or one) and closes their rooms.
async function endQuickCalls(lessonId?: string) {
  const supabase = await createClient();
  let query = supabase.from("lessons").delete().eq("kind", "quick");
  if (lessonId) query = query.eq("id", lessonId);
  const { data } = await query.select("id");
  await Promise.all((data ?? []).map((row) => closeRoom(row.id)));
}

// One-off call: created and opened straight away. Ended by the teacher's Leave, "End" on the
// dashboard, or after 12 h. Only one at a time: starting a new one ends the old one.
export async function startQuickCall() {
  await endQuickCalls();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .insert({ title: "Quick call", kind: "quick", invite_slug: newSlug() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/lesson/${data.id}`);
}

// Removes a student or ends a quick call, and closes its room so nobody is left in it.
// RLS limits this to the teacher's own rows.
export async function removeLesson(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();

  // The student's files first: their rows go with the lesson (cascade), the stored files don't.
  const { data: files } = await supabase.from("resources").select("path").eq("lesson_id", id);
  if (files?.length) {
    await supabase.storage.from("resources").remove(files.map((f) => f.path));
  }

  const { data } = await supabase.from("lessons").delete().eq("id", id).select("id");
  if (data?.length) await closeRoom(data[0].id);
  revalidatePath("/dashboard");
  // Removed from its own classroom page: back to the dashboard.
  if (formData.get("then") === "dashboard") redirect("/dashboard");
}

// Deletes one file from a classroom: the stored file, then its row.
export async function removeResource(formData: FormData) {
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("resources")
    .select("id, lesson_id, path")
    .eq("id", String(formData.get("id")))
    .maybeSingle();
  if (!file) return;

  if (file.path) {
    const { error } = await supabase.storage.from("resources").remove([file.path]);
    if (error) throw new Error(error.message);
  }
  await supabase.from("resources").delete().eq("id", file.id);
  revalidatePath(`/dashboard/${file.lesson_id}`);
}

// The teacher clicked Leave in a quick call: the call is over for everyone.
export async function leaveQuickCall(lessonId: string) {
  await endQuickCalls(lessonId);
  revalidatePath("/dashboard");
}

// The name students see in calls (the teacher account has no sign-up page to ask for it).
// Kept in the account's user metadata, so no table is needed.
export async function setTeacherName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) return;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// "Send feedback" in the dashboard header (G1). Stored in Supabase (`feedback`, migration
// 0010); the user reads it in the table editor. Returns whether it was saved.
export async function sendFeedback(message: string, page: string) {
  const text = message.trim().slice(0, 2000);
  if (!text) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const teacherId = data?.claims?.sub;
  if (!teacherId) return false;
  const { error } = await supabase
    .from("feedback")
    .insert({ teacher_id: teacherId, message: text, page: page.slice(0, 200) });
  if (error) console.error("feedback:", error.message);
  return !error;
}

// G2: a link in the classroom (a YouTube video or any web page). A YouTube link gets the
// video's title from YouTube; anything else is named after the site unless a name is given.
// Returns a message for the teacher when it can't be added.
export async function addLink(lessonId: string, rawUrl: string, rawName: string): Promise<string | null> {
  const url = normalizeUrl(rawUrl);
  if (!url) return "That doesn't look like a web address. Paste a link starting with https://";
  let name = rawName.trim().slice(0, 200);
  if (!name && youtubeId(url)) name = (await youtubeTitle(url)) ?? "";
  if (!name) name = linkLabel(url);

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .insert({ lesson_id: lessonId, kind: "link", name, url, size: 0 });
  if (error) {
    console.error("addLink:", error.message);
    return "The link could not be saved. Please try again.";
  }
  revalidatePath(`/dashboard/${lessonId}`);
  return null;
}

async function youtubeTitle(url: string) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const { title } = (await res.json()) as { title?: unknown };
    return typeof title === "string" ? title.slice(0, 200) : null;
  } catch {
    return null;
  }
}
