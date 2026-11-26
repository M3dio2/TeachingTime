import type { Metadata } from "next";
import { Suspense } from "react";
import StudentJoin from "@/components/room/StudentJoin";
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
    .select("next_lesson_at, repeats_weekly, teacher_id")
    .eq("invite_slug", slug)
    .eq("kind", "student")
    .maybeSingle();
  if (!data?.next_lesson_at) return null;
  const { data: teacher } = await admin.auth.admin.getUserById(data.teacher_id);
  const name = teacher.user?.user_metadata?.display_name;
  return { at: data.next_lesson_at as string, weekly: Boolean(data.repeats_weekly), teacher: typeof name === "string" ? name : "" };
}
