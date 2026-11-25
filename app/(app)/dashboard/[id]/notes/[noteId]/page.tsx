import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrintButton from "@/components/classroom/PrintButton";
import Wordmark from "@/components/ui/Wordmark";
import { getLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lesson note", robots: { index: false, follow: false } };

// Review A5: one lesson note on a clean page, to print or save as PDF for the student.
export default async function NotePage({ params }: PageProps<"/dashboard/[id]/notes/[noteId]">) {
  const { id, noteId } = await params;
  const [supabase, { plan: t }, locale] = await Promise.all([createClient(), getT(), getLocale()]);
  const [{ data: note }, { data: lesson }] = await Promise.all([
    supabase.from("lesson_notes").select("body, lesson_date").eq("id", noteId).eq("lesson_id", id).maybeSingle(),
    supabase.from("lessons").select("title").eq("id", id).maybeSingle(),
  ]);
  if (!note || !lesson) notFound();
  const date = new Date(`${note.lesson_date}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-10 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-4">
        <Wordmark size="sm" underline="none" />
        <PrintButton label={t.printNote} />
      </div>
      <header className="flex flex-col gap-1 border-b border-line pb-4">
        <h1 className="text-[28px] leading-tight">{t.calendarTitle(lesson.title)}</h1>
        <p className="text-ink-muted">{date}</p>
      </header>
      <article className="text-[16px] leading-relaxed whitespace-pre-wrap">{note.body}</article>
    </main>
  );
}
