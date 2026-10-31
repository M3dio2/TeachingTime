"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  const { error } = await supabase.storage.from("resources").remove([file.path]);
  if (error) throw new Error(error.message);
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
  redirect("/");
}
