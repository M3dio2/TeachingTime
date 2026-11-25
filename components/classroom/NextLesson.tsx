"use client";

import { CalendarClock, CalendarPlus, Check, Copy, Repeat } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { setNextLesson } from "@/app/(app)/dashboard/[id]/plan-actions";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useLocale, useT } from "@/lib/i18n/client";
import { downloadIcs, formatLesson, fromLocalParts, icsFile, localParts, upcoming } from "@/lib/schedule";

// Review A4: plan the next lesson on the Classroom page. Shown in the teacher's time zone;
// the calendar file uses UTC, so any calendar shows it right. The reminder is text to paste
// into WhatsApp or an email (TeachingTime has no student addresses).
const noop = () => () => {};
const useNow = () => useSyncExternalStore(noop, () => Math.floor(Date.now() / 60000) * 60000, () => 0);

export default function NextLesson({
  lessonId,
  name,
  slug,
  nextAt,
  weekly,
}: {
  lessonId: string;
  name: string;
  slug: string;
  nextAt: string | null;
  weekly: boolean;
}) {
  const t = useT().plan;
  const locale = useLocale();
  const now = useNow();
  const next = now ? upcoming(nextAt, weekly, now) : null;
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const link = `${origin}/join/${slug}`;

  const when = next ? formatLesson(next, locale) : "";
  const copyReminder = async () => {
    if (!next) return;
    const text = (weekly ? t.reminderTextWeekly : t.reminderText)(name, formatLesson(next, locale, true), link);
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const calendar = () =>
    next &&
    downloadIcs(
      t.calendarTitle(name),
      icsFile({ uid: lessonId, title: t.calendarTitle(name), start: next, url: link, weekly, description: t.calendarDescription(link) }),
    );

  return (
    <section aria-labelledby="next-lesson" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="next-lesson" className="flex items-center gap-2 text-[18px] font-semibold">
          <CalendarClock size={18} aria-hidden className="text-accent" />
          {t.nextLesson}
        </h2>
        {next && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-accent hover:underline">
            {t.change}
          </button>
        )}
      </div>
      {editing || (!next && now) ? (
        editing ? (
          <PlanForm lessonId={lessonId} next={next} weekly={weekly} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex flex-col gap-2.5">
            <span className="text-sm text-ink-muted">{t.notPlanned}</span>
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "md", "h-11 font-semibold")}>
              {t.plan}
            </button>
          </div>
        )
      ) : next ? (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-x-2 text-[17px] font-semibold" data-testid="next-lesson-when">
            <time dateTime={next.toISOString()}>{when}</time>
            {weekly && (
              <span className="inline-flex items-center gap-1 text-sm font-normal text-ink-muted">
                <Repeat size={14} aria-hidden />
                {t.everyWeek}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={calendar} className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3")}>
              <CalendarPlus size={15} aria-hidden />
              {t.addToCalendar}
            </button>
            <button type="button" onClick={copyReminder} className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3")}>
              {copied ? <Check size={15} aria-hidden className="text-ok" /> : <Copy size={15} aria-hidden />}
              {copied ? t.reminderCopied : t.copyReminder(name)}
            </button>
          </div>
        </div>
      ) : (
        <span className="h-11" />
      )}
    </section>
  );
}

function PlanForm({
  lessonId,
  next,
  weekly: weeklyNow,
  onDone,
}: {
  lessonId: string;
  next: Date | null;
  weekly: boolean;
  onDone: () => void;
}) {
  const t = useT().plan;
  // A new plan starts a week from now at the next full hour.
  const [initial] = useState(() => {
    if (next) return localParts(next);
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return localParts(d);
  });
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [weekly, setWeekly] = useState(next ? weeklyNow : true);
  const [pending, start] = useTransition();
  const at = fromLocalParts(date, time);
  const now = useNow();
  const past = at !== null && now > 0 && at.getTime() < now - 60_000;

  const save = () =>
    start(async () => {
      if (!at || past) return;
      await setNextLesson(lessonId, at.toISOString(), weekly);
      onDone();
    });
  const clear = () =>
    start(async () => {
      await setNextLesson(lessonId, null, false);
      onDone();
    });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap gap-2.5">
        <label className="flex min-w-0 flex-[1_1_150px] flex-col gap-1 text-sm font-medium">
          {t.date}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass()} />
        </label>
        <label className="flex w-[120px] flex-col gap-1 text-sm font-medium">
          {t.time}
          <input type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} className={inputClass()} />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-5 w-5 accent-[var(--color-accent)]" />
        {t.weekly}
      </label>
      {past && (
        <p role="alert" className="text-sm text-danger">
          {t.pastDate}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || !at || past} className={buttonClass("primary", "md", "h-10 px-4 font-semibold")}>
          {pending ? t.saving : t.save}
        </button>
        <button type="button" onClick={onDone} disabled={pending} className={buttonClass("ghost", "md", "h-10 px-3 text-ink!")}>
          {t.cancel}
        </button>
        {next && (
          <button type="button" onClick={clear} disabled={pending} className="ml-auto text-sm text-ink-muted hover:text-danger hover:underline">
            {t.remove}
          </button>
        )}
      </div>
    </form>
  );
}

// The dashboard card's "Next: Tue, 2 Dec, 17:00" (in the teacher's time zone).
export function NextLessonLine({ nextAt, weekly }: { nextAt: string | null; weekly: boolean }) {
  const t = useT().plan;
  const locale = useLocale();
  const now = useNow();
  const next = now ? upcoming(nextAt, weekly, now) : null;
  if (!next) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-ink" data-testid="card-next-lesson">
      <CalendarClock size={14} aria-hidden className="text-accent" />
      <time dateTime={next.toISOString()}>{t.dashboardNext(formatLesson(next, locale))}</time>
    </span>
  );
}
