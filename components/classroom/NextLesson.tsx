"use client";

import { CalendarClock, CalendarPlus, Check, Copy, Plus, Repeat } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useLessonDialogs } from "@/components/calendar/Dialogs";
import { dayOf, timeOf } from "@/components/calendar/LessonActions";
import { buttonClass } from "@/components/ui/Button";
import { useLocale, useT } from "@/lib/i18n/client";
import { nextOf, type Slot, type SlotChange } from "@/lib/calendar";
import { downloadIcs, formatLesson, icsFile } from "@/lib/schedule";

// The Classroom page's lessons (calendar, 0018): the next ones with a click to start or change
// them, Plan a lesson, and for the next one a calendar file and a reminder to paste into
// WhatsApp or an email (TeachingTime has no student addresses).
const noop = () => () => {};
const useNow = () => useSyncExternalStore(noop, () => Math.floor(Date.now() / 60000) * 60000, () => 0);

export default function NextLesson({
  lessonId,
  name,
  slug,
  slots,
  changes,
  waiting,
}: {
  lessonId: string;
  name: string;
  slug: string;
  slots: Slot[];
  changes: SlotChange[];
  waiting: boolean;
}) {
  const t = useT().plan;
  const tc = useT().calendar;
  const locale = useLocale();
  const now = useNow();
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const link = `${origin}/join/${slug}`;
  const room = { id: lessonId, title: name, slug };
  const { dialogs, plan, show } = useLessonDialogs({ classrooms: [room], waiting: new Set(waiting ? [lessonId] : []), lessonId });
  const coming = now ? nextOf(slots, changes, new Date(now), 4) : [];
  const next = coming[0];

  const copyReminder = async () => {
    if (!next) return;
    const text = (next.weekly ? t.reminderTextWeekly : t.reminderText)(name, formatLesson(next.start, locale, true), link);
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const calendar = () =>
    next &&
    downloadIcs(
      t.calendarTitle(name),
      icsFile({
        uid: next.slotId,
        title: t.calendarTitle(name),
        start: next.start,
        url: link,
        weekly: next.weekly,
        description: t.calendarDescription(link),
      }),
    );

  return (
    <section aria-labelledby="next-lesson" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <h2 id="next-lesson" className="flex items-center gap-2 text-[18px] font-semibold">
        <CalendarClock size={18} aria-hidden className="text-accent" />
        {t.nextLesson}
      </h2>
      {now > 0 && !next && <span className="text-sm text-ink-muted">{t.notPlanned}</span>}
      {next && (
        <ul className="flex flex-col">
          {coming.slice(0, 3).map((o, i) => (
            <li key={o.key} className="border-t border-line first:border-t-0">
              <button
                type="button"
                onClick={() => show(o)}
                className={`flex w-full flex-wrap items-center gap-x-2 rounded-md py-2 text-left hover:bg-surface-2 ${i ? "text-[15px]" : "text-[17px] font-semibold"}`}
                data-testid={i ? undefined : "next-lesson-when"}
              >
                <time dateTime={o.start.toISOString()}>
                  {dayOf(o.start, locale)}, {timeOf(o.start, locale)}
                </time>
                <span className="text-sm font-normal text-ink-muted">· {tc.minutes(o.minutes)}</span>
                {o.weekly && (
                  <span className="inline-flex items-center gap-1 text-sm font-normal text-ink-muted">
                    <Repeat size={14} aria-hidden />
                    {t.everyWeek}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap lg:flex-col">
        <button type="button" onClick={() => plan()} className={buttonClass(next ? "secondary" : "primary", "sm", "h-9 gap-1.5 px-3 font-semibold")}>
          <Plus size={15} aria-hidden />
          {tc.planLesson}
        </button>
        {next && (
          <>
            <button type="button" onClick={calendar} className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3")}>
              <CalendarPlus size={15} aria-hidden />
              {t.addToCalendar}
            </button>
            <button type="button" onClick={copyReminder} className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3")}>
              {copied ? <Check size={15} aria-hidden className="text-ok" /> : <Copy size={15} aria-hidden />}
              {copied ? t.reminderCopied : t.copyReminder(name)}
            </button>
          </>
        )}
      </div>
      {dialogs}
    </section>
  );
}

// The dashboard card's "Next: Tue, 2 Dec, 17:00" (in the teacher's time zone).
export function NextLessonLine({ slots, changes }: { slots: Slot[]; changes: SlotChange[] }) {
  const t = useT().plan;
  const locale = useLocale();
  const now = useNow();
  const next = now ? (nextOf(slots, changes, new Date(now), 1)[0]?.start ?? null) : null;
  if (!next) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-ink" data-testid="card-next-lesson">
      <CalendarClock size={14} aria-hidden className="text-accent" />
      <time dateTime={next.toISOString()}>{t.dashboardNext(formatLesson(next, locale))}</time>
    </span>
  );
}
