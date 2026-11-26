"use client";

import { CalendarClock, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { dayOf, timeOf } from "@/components/calendar/LessonActions";
import { buttonClass } from "@/components/ui/Button";
import { useLocale, useT } from "@/lib/i18n/client";
import { nextOf, type Slot, type SlotChange } from "@/lib/calendar";
import { formatLesson } from "@/lib/schedule";

const noop = () => () => {};
const useNow = () => useSyncExternalStore(noop, () => Math.floor(Date.now() / 60000) * 60000, () => 0);

// The Classroom page's next lesson: one line and the way to the calendar, where lessons are
// planned and changed (the calendar opens on this Classroom's week, or with the plan form).
export default function NextLesson({ lessonId, slots, changes }: { lessonId: string; slots: Slot[]; changes: SlotChange[] }) {
  const t = useT().plan;
  const tc = useT().calendar;
  const locale = useLocale();
  const now = useNow();
  const next = now ? nextOf(slots, changes, new Date(now), 1)[0] : undefined;
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4" data-testid="classroom-next-lesson">
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        <CalendarClock size={15} aria-hidden className="text-accent" />
        {t.nextLesson}
      </span>
      {now > 0 && (
        <span className="text-[16px] font-semibold" data-testid="next-lesson-when">
          {next ? (
            <>
              <time dateTime={next.start.toISOString()}>
                {dayOf(next.start, locale)}, {timeOf(next.start, locale)}
              </time>
              <span className="text-sm font-normal text-ink-muted">
                {" "}
                · {tc.minutes(next.minutes)}
                {next.weekly ? ` · ${t.everyWeek}` : ""}
              </span>
            </>
          ) : (
            <span className="font-normal text-ink-muted">{t.notPlanned}</span>
          )}
        </span>
      )}
      <Link href={`/dashboard/calendar?classroom=${lessonId}`} className={buttonClass("secondary", "md", "h-10 gap-1.5 font-semibold")}>
        <CalendarDays size={16} aria-hidden />
        {next ? tc.openInCalendar : tc.planInCalendar}
      </Link>
    </div>
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
