import type { Metadata } from "next";
import { Suspense } from "react";
import StudentJoin from "@/components/room/StudentJoin";
import { nextOf, type Slot, type SlotChange } from "@/lib/calendar";
import { createAdminClient } from "@/lib/supabase/server";

// A private link: never listed by search engines.
// What a student sees when the teacher sends the link (WhatsApp, Mail, Messages).
export const metadata: Metadata = {
  title: "Join your lesson",
  description: "Your teacher has invited you to a lesson. Open this link at lesson time: no account, no download.",
  openGraph: {
    title: "Join your lesson on TeachingTime",
    description: "Your teacher has invited you to a lesson. Open this link at lesson time: no account, no download.",
  },
  robots: { index: false, follow: false },
};

// The slug is checked by the token route when the student clicks Join.
export default function JoinPage({ params }: PageProps<"/join/[slug]">) {
  return (
    <Suspense>
      <Join params={params} />
    </Suspense>
  );
}

async function Join({ params }: Pick<PageProps<"/join/[slug]">, "params">) {
  const { slug } = await params;
  return <StudentJoin slug={slug} next={await nextLesson(slug)} />;
}

// Review A4: the planned next lesson, so the student can put it in their calendar. Only the
// time and the teacher's name (whoever has the link may join the lesson anyway).
async function nextLesson(slug: string) {
  if (!/^[a-z0-9]{6,32}$/.test(slug)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("lessons")
    .select("id, teacher_id")
    .eq("invite_slug", slug)
    .eq("kind", "student")
    .maybeSingle();
  if (!data) return null;
  // The calendar (0018): the next lesson that isn't cancelled.
  const { data: slots } = await admin
    .from("lesson_slots")
    .select("id, lesson_id, starts_at, minutes, weekly, ends_on, time_zone")
    .eq("lesson_id", data.id);
  if (!slots?.length) return null;
  const { data: changes } = await admin
    .from("slot_changes")
    .select("slot_id, occurs_at, cancelled, moved_to, moved_minutes")
    .in(
      "slot_id",
      slots.map((s) => s.id),
    );
  const next = nextOf(slots as Slot[], (changes ?? []) as SlotChange[], new Date(), 1)[0];
  if (!next) return null;
  const { data: teacher } = await admin.auth.admin.getUserById(data.teacher_id);
  const name = teacher.user?.user_metadata?.display_name;
  // A moved lesson is a one-off in the student's calendar file.
  return { at: next.start.toISOString(), weekly: next.weekly && !next.moved, teacher: typeof name === "string" ? name : "" };
}
