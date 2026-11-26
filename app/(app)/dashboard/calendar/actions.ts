"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The calendar (migration 0018). RLS keeps every write to the teacher's own Classrooms and
// slots; these only check the shape. Each returns an error message key or null.

type Result = { error: string } | null;

const isZone = (z: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: z });
    return z.length <= 64;
  } catch {
    return false;
  }
};
const validDate = (iso: string) => !Number.isNaN(new Date(iso).getTime());
const validMinutes = (m: number) => Number.isInteger(m) && m >= 15 && m <= 240;

function refresh(lessonId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  if (lessonId) revalidatePath(`/dashboard/${lessonId}`);
}

// A new lesson: once or every week.
export async function planLesson(input: {
  lessonId: string;
  startsAt: string;
  minutes: number;
  weekly: boolean;
  timeZone: string;
}): Promise<Result> {
  if (!validDate(input.startsAt) || !validMinutes(input.minutes) || !isZone(input.timeZone)) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_slots").insert({
    lesson_id: input.lessonId,
    starts_at: new Date(input.startsAt).toISOString(),
    minutes: input.minutes,
    weekly: input.weekly,
    time_zone: input.timeZone,
  });
  if (error) {
    console.error("lesson_slots insert:", error.message);
    return { error: error.code === "P0001" ? "tooMany" : "failed" };
  }
  refresh(input.lessonId);
  return null;
}

// Change one lesson, or a weekly series from this lesson on.
// - once (or a one-off): the slot's change row (a one-off is updated directly).
// - "every week": the series ends the day before this lesson and a new one starts with the new
//   time, so the lessons before it stay as they were. From the first lesson: just updated.
export async function changeLesson(input: {
  slotId: string;
  occursAt: string; // the lesson's original start
  startsAt: string;
  minutes: number;
  scope: "this" | "following";
  timeZone: string;
}): Promise<Result> {
  if (!validDate(input.occursAt) || !validDate(input.startsAt) || !validMinutes(input.minutes) || !isZone(input.timeZone))
    return { error: "invalid" };
  const supabase = await createClient();
  const { data: slot } = await supabase
    .from("lesson_slots")
    .select("id, lesson_id, starts_at, weekly, ends_on, time_zone")
    .eq("id", input.slotId)
    .maybeSingle();
  if (!slot) return { error: "failed" };
  const occurs = new Date(input.occursAt).toISOString();
  const starts = new Date(input.startsAt).toISOString();
  const first = new Date(slot.starts_at).getTime() === new Date(occurs).getTime();

  let error: { message: string } | null = null;
  if (!slot.weekly || (input.scope === "following" && first)) {
    ({ error } = await supabase
      .from("lesson_slots")
      .update({ starts_at: starts, minutes: input.minutes, time_zone: input.timeZone })
      .eq("id", slot.id));
    // Changes of single lessons no longer line up with the moved series.
    if (!error && slot.weekly) await supabase.from("slot_changes").delete().eq("slot_id", slot.id);
  } else if (input.scope === "this") {
    ({ error } = await supabase
      .from("slot_changes")
      .upsert({ slot_id: slot.id, occurs_at: occurs, cancelled: false, moved_to: starts, moved_minutes: input.minutes }));
  } else {
    ({ error } = await supabase
      .from("lesson_slots")
      .update({ ends_on: dayBefore(occurs, slot.time_zone) })
      .eq("id", slot.id));
    if (!error) {
      await supabase.from("slot_changes").delete().eq("slot_id", slot.id).gte("occurs_at", occurs);
      ({ error } = await supabase.from("lesson_slots").insert({
        lesson_id: slot.lesson_id,
        starts_at: starts,
        minutes: input.minutes,
        weekly: true,
        ends_on: slot.ends_on,
        time_zone: input.timeZone,
      }));
    }
  }
  if (error) {
    console.error("changeLesson:", error.message);
    return { error: "failed" };
  }
  refresh(slot.lesson_id);
  return null;
}

// Cancel one lesson, or a weekly series from this lesson on (the earlier ones stay in the past
// as they were). A one-off, or a series from its first lesson: deleted.
export async function cancelLesson(input: { slotId: string; occursAt: string; scope: "this" | "following" }): Promise<Result> {
  if (!validDate(input.occursAt)) return { error: "invalid" };
  const supabase = await createClient();
  const { data: slot } = await supabase
    .from("lesson_slots")
    .select("id, lesson_id, starts_at, weekly, time_zone")
    .eq("id", input.slotId)
    .maybeSingle();
  if (!slot) return { error: "failed" };
  const occurs = new Date(input.occursAt).toISOString();
  const first = new Date(slot.starts_at).getTime() === new Date(occurs).getTime();

  let error: { message: string } | null = null;
  if (!slot.weekly || (input.scope === "following" && first)) {
    ({ error } = await supabase.from("lesson_slots").delete().eq("id", slot.id));
  } else if (input.scope === "this") {
    ({ error } = await supabase
      .from("slot_changes")
      .upsert({ slot_id: slot.id, occurs_at: occurs, cancelled: true, moved_to: null, moved_minutes: null }));
  } else {
    ({ error } = await supabase
      .from("lesson_slots")
      .update({ ends_on: dayBefore(occurs, slot.time_zone) })
      .eq("id", slot.id));
    if (!error) await supabase.from("slot_changes").delete().eq("slot_id", slot.id).gte("occurs_at", occurs);
  }
  if (error) {
    console.error("cancelLesson:", error.message);
    return { error: "failed" };
  }
  refresh(slot.lesson_id);
  return null;
}

// Undo a single lesson's cancel or move.
export async function restoreLesson(input: { slotId: string; occursAt: string }): Promise<Result> {
  if (!validDate(input.occursAt)) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("slot_changes")
    .delete()
    .eq("slot_id", input.slotId)
    .eq("occurs_at", new Date(input.occursAt).toISOString());
  if (error) return { error: "failed" };
  refresh();
  return null;
}

// The private calendar link: created on first use; "new link" replaces it (the old one stops).
export async function calendarFeedToken(renew = false): Promise<string | null> {
  const supabase = await createClient();
  if (renew) await supabase.from("calendar_feeds").delete().neq("token", "");
  const { data } = await supabase.from("calendar_feeds").select("token").maybeSingle();
  if (data?.token) return data.token;
  const { data: created, error } = await supabase.from("calendar_feeds").insert({}).select("token").single();
  if (error) {
    console.error("calendar_feeds:", error.message);
    return null;
  }
  return created.token;
}

// "2026-12-01" → the day before, in the series' zone.
function dayBefore(iso: string, zone: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
  const day = f.format(new Date(iso)); // YYYY-MM-DD
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
