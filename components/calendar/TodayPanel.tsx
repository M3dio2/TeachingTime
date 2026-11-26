"use client";

import { CalendarDays, Plus, Video } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { useLocale, useT } from "@/lib/i18n/client";
import { addDays, isStartable, nextOf, occurrences, type Slot, type SlotChange } from "@/lib/calendar";
import { useLessonDialogs } from "./Dialogs";
import { dayOf, timeOf, useNow, WaitingBadge } from "./LessonActions";
import type { Classroom } from "./PlanDialog";

// The dashboard's right column (option A's content in option B's place): today's lessons with
// their Start buttons, what's next when today is empty, Plan a lesson, the calendar.
export default function TodayPanel({
  classrooms,
  slots,
  changes,
  waitingIds,
}: {
  classrooms: Classroom[];
  slots: Slot[];
  changes: SlotChange[];
  waitingIds: string[];
}) {
  const t = useT().calendar;
  const locale = useLocale();
  const now = useNow();
  const waiting = new Set(waitingIds);
  const { dialogs, plan, show } = useLessonDialogs({ classrooms, waiting });
  const byId = new Map(classrooms.map((c) => [c.id, c]));

  const midnight = now ? new Date(new Date(now).setHours(0, 0, 0, 0)) : null;
  const today = midnight ? occurrences(slots, changes, midnight, addDays(midnight, 1)).filter((o) => byId.has(o.lessonId)) : [];
  const next = now && !today.some((o) => !o.cancelled && o.start.getTime() + o.minutes * 60_000 > now)
    ? nextOf(slots, changes, new Date(now), 1, 60).find((o) => byId.has(o.lessonId))
    : undefined;
  const active = today.filter((o) => !o.cancelled).length;

  return (
    <aside aria-labelledby="today-title" className="flex flex-col gap-1 rounded-panel border border-line bg-surface p-4 pb-3 lg:sticky lg:top-4">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="today-title" className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.01em]">
          {t.today}
        </h2>
        {now > 0 && (
          <span className="text-sm text-ink-muted">
            {new Date(now).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
          </span>
        )}
      </div>
      {now > 0 && <p className="px-1 text-sm text-ink-muted">{active ? t.todayCount(active) : t.noLessonsToday}</p>}

      <ul className="mt-2 flex flex-col" data-testid="today-list">
        {today.map((o) => {
          const room = byId.get(o.lessonId)!;
          const end = o.start.getTime() + o.minutes * 60_000;
          const over = end <= now;
          const isWaiting = waiting.has(o.lessonId) && !o.cancelled && !over;
          const live = isWaiting || isStartable(o, now);
          const soon = Math.round((o.start.getTime() - now) / 60_000);
          return (
            <li key={o.key} className="border-t border-line first:border-t-0">
              <div className="flex items-center gap-2 py-2.5">
                <button
                  type="button"
                  onClick={() => show(o)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-md px-1 py-0.5 text-left hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <span className={`flex w-[70px] shrink-0 flex-col tabular-nums ${o.cancelled ? "text-ink-muted line-through" : ""}`}>
                    <span className="text-[15px] font-semibold whitespace-nowrap">{timeOf(o.start, locale)}</span>
                    <span className="text-xs text-ink-muted">{t.minutes(o.minutes)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <span className={`max-w-full truncate font-semibold ${o.cancelled ? "text-ink-muted line-through" : ""}`}>{room.title}</span>
                    {isWaiting ? (
                      <WaitingBadge />
                    ) : (
                      <span className="text-[13px] text-ink-muted">
                        {o.cancelled ? t.cancelled : over ? t.done : isStartable(o, now) ? t.now : soon > 0 ? t.inMinutes(soon) : ""}
                      </span>
                    )}
                  </span>
                </button>
                {!o.cancelled && !over && (
                  <Link
                    href={`/lesson/${room.id}`}
                    aria-label={`${t.startLesson}: ${room.title}`}
                    className={buttonClass(live ? "primary" : "secondary", "sm", "h-9 shrink-0 px-3 font-semibold")}
                  >
                    <Video size={15} aria-hidden />
                    {t.start}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {now > 0 && !today.length && (
        <p className="rounded-md bg-surface-2 px-3 py-2.5 text-sm text-ink-muted">
          {next ? t.nextUp(`${dayOf(next.start, locale)}, ${timeOf(next.start, locale)}`, byId.get(next.lessonId)!.title) : t.nothingPlanned}
        </p>
      )}
      {now > 0 && today.length > 0 && next && (
        <p className="px-1 pt-1 text-[13px] text-ink-muted">
          {t.nextUp(`${dayOf(next.start, locale)}, ${timeOf(next.start, locale)}`, byId.get(next.lessonId)!.title)}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
        <button type="button" onClick={() => plan()} className={buttonClass("secondary", "sm", "h-10 gap-1.5 px-3 font-semibold")}>
          <Plus size={16} aria-hidden />
          {t.planLesson}
        </button>
        <Link href="/dashboard/calendar" className={buttonClass("ghost", "sm", "h-10 gap-1.5 px-3 text-ink!")}>
          <CalendarDays size={16} aria-hidden />
          {t.openCalendar}
        </Link>
      </div>
      {dialogs}
    </aside>
  );
}

