import "server-only";
import type { Slot, SlotChange } from "@/lib/calendar";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// The teacher's planned lessons (RLS: her own). Before migration 0018 the tables don't exist:
// then simply nothing is planned.
export async function loadCalendar(supabase: Client, lessonId?: string): Promise<{ slots: Slot[]; changes: SlotChange[] }> {
  let q = supabase.from("lesson_slots").select("id, lesson_id, starts_at, minutes, weekly, ends_on, time_zone");
  if (lessonId) q = q.eq("lesson_id", lessonId);
  const { data: slots, error } = await q;
  if (error || !slots?.length) return { slots: [], changes: [] };
  const { data: changes } = await supabase
    .from("slot_changes")
    .select("slot_id, occurs_at, cancelled, moved_to, moved_minutes")
    .in(
      "slot_id",
      slots.map((s) => s.id),
    );
  return { slots: slots as Slot[], changes: (changes ?? []) as SlotChange[] };
}
