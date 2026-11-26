import { icsFeed, type Slot, type SlotChange } from "@/lib/calendar";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";

// The teacher's private calendar feed (/api/calendar/<token>.ics), for Google, Apple and
// Outlook subscriptions: every planned lesson, weekly ones as repeating events. The token is
// the only key (calendar_feeds); "make a new link" replaces it.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  if (!/^[0-9a-f]{64}$/.test(token)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: feed } = await admin.from("calendar_feeds").select("teacher_id").eq("token", token).maybeSingle();
  if (!feed) return new Response("Not found", { status: 404 });

  const [{ data: slots }, { data: rooms }, { data: user }] = await Promise.all([
    admin.from("lesson_slots").select("id, lesson_id, starts_at, minutes, weekly, ends_on, time_zone").eq("teacher_id", feed.teacher_id),
    admin.from("lessons").select("id, title").eq("teacher_id", feed.teacher_id).eq("kind", "student"),
    admin.auth.admin.getUserById(feed.teacher_id),
  ]);
  const { data: changes } = await admin.from("slot_changes").select("slot_id, occurs_at, cancelled, moved_to, moved_minutes").eq("teacher_id", feed.teacher_id);
  const byId = new Map((rooms ?? []).map((r) => [r.id as string, r]));
  const teacher = String(user?.user?.user_metadata?.display_name ?? "");
  const body = icsFeed(
    ((slots ?? []) as Slot[]).filter((s) => byId.has(s.lesson_id)),
    (changes ?? []) as SlotChange[],
    (id) => `Lesson with ${byId.get(id)?.title ?? ""}`,
    (id) => `${SITE_URL}/lesson/${id}`, // her way into the call
    teacher ? `TeachingTime · ${teacher}` : "TeachingTime lessons",
  );
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
