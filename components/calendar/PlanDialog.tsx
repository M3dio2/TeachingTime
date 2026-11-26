"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { changeLesson, planLesson } from "@/app/(app)/dashboard/calendar/actions";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useT } from "@/lib/i18n/client";
import { browserZone, LENGTHS, type Occurrence } from "@/lib/calendar";
import { fromLocalParts, localParts } from "@/lib/schedule";

export type Classroom = { id: string; title: string; slug: string };

// Plan a new lesson, or change one (mock-up 4). Who, which day, what time, how long, once or
// every week; changing a weekly lesson asks "only this one / this and the following". Times
// are in the browser's zone (the student's link shows them in theirs).
export default function PlanDialog({
  classrooms,
  at,
  lessonId,
  preset,
  editing,
  onClose,
}: {
  classrooms: Classroom[];
  at?: Date; // a new lesson: the clicked time
  lessonId?: string; // a new lesson for this Classroom only (no choice)
  preset?: string; // a new lesson: this Classroom chosen first (can be changed)
  editing?: Occurrence; // change this lesson
  onClose: () => void;
}) {
  const t = useT().calendar;
  const [initial] = useState(() => {
    if (editing) return localParts(editing.start);
    if (at) return localParts(at);
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return localParts(d);
  });
  const [who, setWho] = useState(editing?.lessonId ?? lessonId ?? preset ?? (classrooms.length === 1 ? classrooms[0].id : ""));
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [minutes, setMinutes] = useState<number>(editing?.minutes ?? 60);
  const [weekly, setWeekly] = useState(editing ? editing.weekly : true);
  const [scope, setScope] = useState<"this" | "following">("this");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const when = fromLocalParts(date, time);
  const [now] = useState(() => Date.now());
  const past = when !== null && when.getTime() < now - 60_000 && !editing;

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("select, input")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const save = () =>
    start(async () => {
      if (!when || past || !who) return;
      setError(null);
      const done = editing
        ? await changeLesson({
            slotId: editing.slotId,
            occursAt: editing.original.toISOString(),
            startsAt: when.toISOString(),
            minutes,
            scope: editing.weekly ? scope : "this",
            timeZone: browserZone(),
          })
        : await planLesson({ lessonId: who, startsAt: when.toISOString(), minutes, weekly, timeZone: browserZone() });
      if (done?.error) setError(done.error === "tooMany" ? t.tooMany : t.failed);
      else onClose();
    });

  const fixed = Boolean(editing || lessonId);
  const name = classrooms.find((c) => c.id === who)?.title;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-panel bg-surface p-5 text-ink shadow-soft"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="plan-title" className="text-[19px] font-semibold">
            {editing ? t.changeLesson : t.newLesson}
            {fixed && name && <span className="font-normal text-ink-muted"> · {name}</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.close} className={buttonClass("ghost", "sm", "h-9 w-9 px-0! text-ink!")}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {!fixed &&
            (classrooms.length ? (
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t.student}
                <select required value={who} onChange={(e) => setWho(e.target.value)} className={inputClass()}>
                  <option value="" disabled>
                    {t.chooseStudent}
                  </option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-ink-muted">{t.noClassrooms}</p>
            ))}
          <div className="flex gap-2.5">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
              {t.day}
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass()} />
            </label>
            <label className="flex w-[118px] flex-col gap-1 text-sm font-medium">
              {t.time}
              <input type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} className={inputClass()} />
            </label>
          </div>
          <fieldset className="flex flex-col gap-1 text-sm font-medium">
            <legend className="mb-1">{t.length}</legend>
            <div className="flex overflow-hidden rounded-md border border-line">
              {LENGTHS.map((m, i) => (
                <label
                  key={m}
                  className={`flex h-10 flex-1 cursor-pointer items-center justify-center text-[14px] has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-inset ${
                    i ? "border-l border-line" : ""
                  } ${minutes === m ? "bg-ink font-semibold text-paper" : "bg-surface hover:bg-surface-2"}`}
                >
                  <input type="radio" name="minutes" value={m} checked={minutes === m} onChange={() => setMinutes(m)} className="sr-only" />
                  {t.minutes(m)}
                </label>
              ))}
            </div>
          </fieldset>
          {!editing && (
            <label className="flex min-h-10 items-center gap-2.5 text-[15px]">
              <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-5 w-5 accent-[var(--color-accent)]" />
              {t.weekly}
            </label>
          )}
          {editing?.weekly && (
            <fieldset className="flex flex-col gap-1.5 text-[15px]">
              <legend className="mb-1 text-sm font-medium">{t.whichLessons}</legend>
              {(["this", "following"] as const).map((s) => (
                <label key={s} className="flex min-h-9 items-center gap-2.5">
                  <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} className="h-5 w-5 accent-[var(--color-accent)]" />
                  {s === "this" ? t.onlyThis : t.thisAndFollowing}
                </label>
              ))}
            </fieldset>
          )}
          {(past || error) && (
            <p role="alert" className="text-sm text-danger">
              {past ? t.pastDate : error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={buttonClass("ghost", "md", "h-11 px-4 text-ink!")}>
              {t.cancel}
            </button>
            <button type="submit" disabled={pending || !when || past || !who} className={buttonClass("primary", "md", "h-11 px-5 font-semibold")}>
              {pending ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
