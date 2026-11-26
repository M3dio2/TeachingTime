"use client";

import { Check, Link2, Pencil, Repeat, RotateCcw, School, Video, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { cancelLesson, restoreLesson } from "@/app/(app)/dashboard/calendar/actions";
import { buttonClass } from "@/components/ui/Button";
import Marker from "@/components/ui/Marker";
import { useLocale, useT } from "@/lib/i18n/client";
import { isStartable, type Occurrence } from "@/lib/calendar";
import type { Classroom } from "./PlanDialog";

const noop = () => () => {};
// The current minute (0 on the server: times render in the browser's zone only).
export function useNow(step = 60_000) {
  const subscribe = (change: () => void) => {
    const id = setInterval(change, 15_000);
    return () => clearInterval(id);
  };
  return useSyncExternalStore(step ? subscribe : noop, () => Math.floor(Date.now() / step) * step, () => 0);
}

export const timeOf = (d: Date, locale: string) => d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
export const dayOf = (d: Date, locale: string) => d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });

// "Waiting", circled by the marker when it appears (the dashboard cards' badge, docs/DESIGN.md).
export function WaitingBadge() {
  const t = useT().calendar;
  return (
    <span className="relative inline-block rounded-full bg-marker-soft px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-marker-ink">
      {t.waiting}
      <Marker shape="circle" width={2.2} delay={0.4} className="absolute -top-1.5 -left-2 h-[calc(100%+0.75rem)] w-[calc(100%+1rem)]" />
    </span>
  );
}

// A lesson's card (mock-up 5): Start lesson first, then link, Classroom, change, cancel.
export function LessonCard({
  occ,
  classroom,
  waiting,
  onChange,
  onClose,
}: {
  occ: Occurrence;
  classroom: Classroom;
  waiting: boolean;
  onChange: () => void;
  onClose: () => void;
}) {
  const t = useT().calendar;
  const locale = useLocale();
  const now = useNow();
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const end = new Date(occ.start.getTime() + occ.minutes * 60_000);
  const when = `${dayOf(occ.start, locale)} · ${timeOf(occ.start, locale)}–${timeOf(end, locale)}`;
  const live = waiting || isStartable(occ, now);

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("a, button:not([aria-label])")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${classroom.slug}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const run = (job: () => Promise<{ error: string } | null>) =>
    start(async () => {
      setError(false);
      const done = await job();
      if (done?.error) setError(true);
      else onClose();
    });
  const cancel = (scope: "this" | "following") =>
    run(() => cancelLesson({ slotId: occ.slotId, occursAt: occ.original.toISOString(), scope }));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-panel bg-surface p-5 text-ink shadow-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="lesson-title" className={`truncate text-[21px] font-semibold ${occ.cancelled ? "line-through" : ""}`}>
              {classroom.title}
            </h2>
            <p className="text-sm text-ink-muted">
              {when}
              {occ.weekly && (
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <Repeat size={13} aria-hidden />
                  {t.everyWeek}
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className={buttonClass("ghost", "sm", "h-9 w-9 shrink-0 px-0! text-ink!")}>
            <X size={18} aria-hidden />
          </button>
        </div>
        {waiting && (
          <p>
            <WaitingBadge />
          </p>
        )}
        {occ.cancelled ? (
          <>
            <p className="text-sm text-ink-muted">{t.cancelled}</p>
            <button type="button" disabled={pending} onClick={() => run(() => restoreLesson({ slotId: occ.slotId, occursAt: occ.original.toISOString() }))} className={buttonClass("secondary", "md", "h-11 font-semibold")}>
              <RotateCcw size={16} aria-hidden />
              {t.restore}
            </button>
          </>
        ) : (
          <>
            <Link href={`/lesson/${classroom.id}`} className={buttonClass(live ? "primary" : "secondary", "md", "h-11 font-semibold")}>
              <Video size={16} aria-hidden />
              {t.startLesson}
            </Link>
            <div className="flex gap-2">
              <button type="button" onClick={copy} className={buttonClass("secondary", "sm", "h-10 min-w-0 flex-1 gap-1.5 px-2 whitespace-nowrap [&>svg]:shrink-0")}>
                {copied ? <Check size={15} aria-hidden className="text-ok" /> : <Link2 size={15} aria-hidden />}
                {copied ? t.linkCopied : t.copyLink(classroom.title)}
              </button>
              <Link href={`/dashboard/${classroom.id}`} className={buttonClass("secondary", "sm", "h-10 min-w-0 flex-1 gap-1.5 px-2 whitespace-nowrap [&>svg]:shrink-0")}>
                <School size={15} aria-hidden />
                {t.openClassroom}
              </Link>
            </div>
            <div className="h-px bg-line" />
            {asking ? (
              <div className="flex flex-col gap-2" role="group" aria-label={t.whichLessons}>
                <p className="text-sm font-medium">{occ.weekly ? t.whichLessons : t.cancelConfirm(classroom.title, when)}</p>
                {occ.weekly ? (
                  <>
                    <button type="button" disabled={pending} onClick={() => cancel("this")} className={buttonClass("secondary", "md", "h-10 justify-start text-danger!")}>
                      {t.onlyThis}
                    </button>
                    <button type="button" disabled={pending} onClick={() => cancel("following")} className={buttonClass("secondary", "md", "h-10 justify-start text-danger!")}>
                      {t.thisAndFollowing}
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={pending} onClick={() => cancel("this")} className={buttonClass("primary", "md", "h-10 bg-danger! font-semibold")}>
                    {t.cancelYes}
                  </button>
                )}
                <button type="button" onClick={() => setAsking(false)} className={buttonClass("ghost", "sm", "h-9 text-ink!")}>
                  {t.keep}
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <button type="button" onClick={onChange} className="flex h-10 items-center gap-2.5 rounded-md px-2 text-left text-[15px] hover:bg-surface-2">
                  <Pencil size={16} aria-hidden className="text-ink-muted" />
                  {t.changeTime}
                </button>
                <button type="button" onClick={() => setAsking(true)} className="flex h-10 items-center gap-2.5 rounded-md px-2 text-left text-[15px] hover:bg-surface-2">
                  <XCircle size={16} aria-hidden className="text-ink-muted" />
                  {t.cancelLesson}
                </button>
              </div>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t.failed}
          </p>
        )}
      </div>
    </div>
  );
}
