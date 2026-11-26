"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { useLocale, useT } from "@/lib/i18n/client";
import { addDays, browserZone, isStartable, occurrences, sameDay, type Occurrence, type Slot, type SlotChange, weekStart } from "@/lib/calendar";
import { useLessonDialogs } from "./Dialogs";
import { dayOf, timeOf, useNow, WaitingBadge } from "./LessonActions";
import type { Classroom } from "./PlanDialog";

const FROM = 7; // the grid's first hour; earlier lessons stretch it
const TO = 22;
const HOUR = 48; // px per hour
// Each Classroom keeps its colour (by its place in the list).
const COLOURS = [
  "bg-[#f6e7d8] border-[#e3c7a9]",
  "bg-[#e8efdf] border-[#c6d6b3]",
  "bg-[#efe3ef] border-[#d9c2d9]",
  "bg-[#e2ebf0] border-[#bfd0db]",
  "bg-[#f3e6c8] border-[#e2cb94]",
  "bg-[#f0e0dc] border-[#dcbcb4]",
];

// The calendar page (mock-ups 4 + 6): a week, Monday first, in the browser's time zone. Click a
// free half hour to plan a lesson there, a lesson to open its card. Phones get the week as a
// day-by-day list instead of the grid.
export default function CalendarWeek({
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
  const [offset, setOffset] = useState(0); // weeks from this one
  const waiting = new Set(waitingIds);
  const { dialogs, plan, show } = useLessonDialogs({ classrooms, waiting });
  const index = new Map(classrooms.map((c, i) => [c.id, i]));
  const byId = new Map(classrooms.map((c) => [c.id, c]));

  if (!now) return <div className="h-[560px] rounded-panel border border-line bg-surface" aria-busy="true" />;

  const start = addDays(weekStart(new Date(now)), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const week = occurrences(slots, changes, start, addDays(start, 7)).filter((o) => byId.has(o.lessonId));
  const first = Math.min(FROM, ...week.map((o) => o.start.getHours()));
  const last = Math.max(TO, ...week.map((o) => Math.ceil(o.start.getHours() + (o.start.getMinutes() + o.minutes) / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const range = `${days[0].toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
  const today = new Date(now);
  const colour = (o: Occurrence) => COLOURS[(index.get(o.lessonId) ?? 0) % COLOURS.length];

  return (
    <section aria-label={t.title} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setOffset(offset - 1)} aria-label={t.previousWeek} title={t.previousWeek} className={buttonClass("secondary", "sm", "h-9 w-9 px-0!")}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button type="button" onClick={() => setOffset(0)} disabled={offset === 0} className={buttonClass("secondary", "sm", "h-9 px-3")}>
            {t.thisWeek}
          </button>
          <button type="button" onClick={() => setOffset(offset + 1)} aria-label={t.nextWeek} title={t.nextWeek} className={buttonClass("secondary", "sm", "h-9 w-9 px-0!")}>
            <ChevronRight size={18} aria-hidden />
          </button>
          <h2 className="ml-2 text-[19px] font-semibold" data-testid="week-range">
            {range}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">{t.timesIn(browserZone().replace(/_/g, " "))}</span>
          <button type="button" onClick={() => plan()} className={buttonClass("primary", "sm", "h-9 gap-1.5 px-3 font-semibold")}>
            <Plus size={16} aria-hidden />
            {t.planLesson}
          </button>
        </div>
      </div>

      {/* The week grid (tablets and up). */}
      <div className="hidden overflow-x-auto rounded-panel border border-line bg-surface md:block">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))" }}>
          <div />
          {days.map((d) => {
            const isToday = sameDay(d, today);
            return (
              <div key={d.toISOString()} className="border-b border-l border-line px-2 py-2 text-[13px] text-ink-muted">
                {d.toLocaleDateString(locale, { weekday: "short" })}
                <span
                  className={`mt-0.5 flex h-8 w-8 items-center justify-center text-[18px] font-semibold ${
                    isToday ? "rounded-full bg-ink text-marker" : "text-ink"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="pr-1.5 text-right text-[11px] text-ink-muted tabular-nums" style={{ height: HOUR }}>
                <span className="relative -top-2 whitespace-nowrap">{h > first ? timeOf(new Date(2000, 0, 1, h), locale) : ""}</span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const mine = week.filter((o) => sameDay(o.start, d));
            return (
              <div key={d.toISOString()} className="relative border-l border-line" data-day={d.getDate()}>
                {hours.map((h) =>
                  [0, 30].map((m) => {
                    const at = new Date(d);
                    at.setHours(h, m, 0, 0);
                    const label = t.freeAt(`${dayOf(at, locale)}, ${timeOf(at, locale)}`);
                    return (
                      <button
                        key={`${h}:${m}`}
                        type="button"
                        aria-label={label}
                        title={label}
                        tabIndex={-1} // 200+ stops; keyboards use "Plan a lesson"
                        onClick={() => plan(at)}
                        className={`block w-full hover:bg-marker/20 focus-visible:bg-marker/25 focus-visible:outline-none ${
                          m ? "" : "border-t border-line"
                        }`}
                        style={{ height: HOUR / 2 }}
                      />
                    );
                  }),
                )}
                {mine.map((o) => {
                  const top = (o.start.getHours() - first + o.start.getMinutes() / 60) * HOUR;
                  const height = Math.max(22, (o.minutes / 60) * HOUR - 3);
                  const room = byId.get(o.lessonId)!;
                  const live = !o.cancelled && (waiting.has(o.lessonId) || isStartable(o, now));
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => show(o)}
                      data-testid="week-lesson"
                      className={`absolute right-1 left-1 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[12.5px] leading-tight focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                        o.cancelled
                          ? "border-line bg-[repeating-linear-gradient(-45deg,#f5efe7,#f5efe7_6px,#eee4d7_6px,#eee4d7_12px)] text-ink-muted line-through"
                          : colour(o)
                      } ${live ? "shadow-[0_0_0_2px_var(--color-ink),3px_3px_0_2px_var(--color-marker)]" : ""}`}
                      style={{ top: top + 1, height }}
                    >
                      <span className={height < 40 ? "mr-1 font-semibold" : "block truncate font-semibold"}>{room.title}</span>
                      <span className="tabular-nums">{timeOf(o.start, locale)}</span>
                    </button>
                  );
                })}
                {sameDay(d, today) && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute right-0 left-0 z-[1] border-t-2 border-danger before:absolute before:-top-[6px] before:-left-[5px] before:h-2.5 before:w-2.5 before:rounded-full before:bg-danger"
                    style={{ top: (today.getHours() - first + today.getMinutes() / 60) * HOUR }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones: the week day by day. */}
      <div className="flex flex-col gap-1 md:hidden" data-testid="week-agenda">
        {days.map((d) => {
          const mine = week.filter((o) => sameDay(o.start, d));
          if (!mine.length && !sameDay(d, today)) return null;
          return (
            <div key={d.toISOString()} className="flex flex-col gap-1.5">
              <h3 className="mt-3 text-[13px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                {sameDay(d, today) ? `${t.today} · ` : ""}
                {dayOf(d, locale)}
              </h3>
              {mine.length ? (
                mine.map((o) => {
                  const room = byId.get(o.lessonId)!;
                  const isWaiting = waiting.has(o.lessonId) && !o.cancelled;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => show(o)}
                      className={`flex items-center justify-between gap-3 rounded-panel border bg-surface p-3.5 text-left ${
                        isWaiting ? "border-ink shadow-[3px_3px_0_var(--color-marker)]" : "border-line"
                      } ${o.cancelled ? "text-ink-muted" : ""}`}
                    >
                      <span className="flex flex-col">
                        <span className={`text-sm tabular-nums ${o.cancelled ? "line-through" : ""}`}>
                          {timeOf(o.start, locale)} · {t.minutes(o.minutes)}
                        </span>
                        <span className={`text-[17px] font-semibold ${o.cancelled ? "line-through" : ""}`}>{room.title}</span>
                        {o.cancelled && <span className="text-[13px]">{t.cancelled}</span>}
                      </span>
                      {isWaiting && <WaitingBadge />}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-ink-muted">{t.noLessonsToday}</p>
              )}
            </div>
          );
        })}
        {!week.length && <p className="mt-3 text-sm text-ink-muted">{t.noLessonsThisWeek}</p>}
      </div>
      {dialogs}
    </section>
  );
}
