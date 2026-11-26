import type { Metadata } from "next";
import { Suspense } from "react";
import CalendarWeek from "@/components/calendar/CalendarWeek";
import SubscribeBox from "@/components/calendar/SubscribeBox";
import { AutoRefresh, DashboardLoading } from "@/components/dashboard/DashboardBits";
import { FeedbackButton, LanguageMenu, NameChip } from "@/components/dashboard/DashboardMenus";
import PageTabs from "@/components/dashboard/PageTabs";
import Wordmark from "@/components/ui/Wordmark";
import { loadCalendar } from "@/lib/calendarData";
import { getT } from "@/lib/i18n/server";
import { occupiedLessons } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";

// Private: never listed by search engines.
export const metadata: Metadata = { title: "Calendar", robots: { index: false, follow: false } };

// The calendar page (docs/PLAN-calendar-library-slides.md, mock-ups 4–6).
export default function CalendarPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Calendar />
    </Suspense>
  );
}

async function Calendar() {
  const [supabase, { calendar: t }] = await Promise.all([createClient(), getT()]);
  const [{ data: auth }, { data: rooms }, occupied] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("lessons").select("id, title, invite_slug").eq("kind", "student").order("title"),
    occupiedLessons(),
  ]);
  const { slots, changes } = await loadCalendar(supabase);
  const classrooms = (rooms ?? []).map((r) => ({ id: r.id as string, title: r.title as string, slug: r.invite_slug as string }));
  const teacherName: string = auth.user?.user_metadata.display_name ?? "";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AutoRefresh />
      <header className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,32px)] py-5">
        <Wordmark underline="still" />
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <FeedbackButton />
          <NameChip name={teacherName} />
        </div>
      </header>
      <PageTabs t={t} current="calendar" />
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-[clamp(16px,4vw,32px)] pt-6 pb-16">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[30px] leading-[1.1] tracking-[-0.02em] md:text-4xl">{t.title}</h1>
          <p className="max-w-[620px] text-ink-muted">{t.intro}</p>
        </div>
        <CalendarWeek classrooms={classrooms} slots={slots} changes={changes} waitingIds={[...(occupied ?? [])]} />
        <SubscribeBox />
      </main>
    </div>
  );
}
