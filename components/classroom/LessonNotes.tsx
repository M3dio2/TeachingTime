"use client";

import { Check, Copy, NotebookPen, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteLessonNote } from "@/app/(app)/dashboard/[id]/plan-actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/lib/i18n/client";

// Review A5: the Classroom's lesson notes (the text pad of each lesson, saved by itself) and
// its past lessons with their length (from LiveKit's room sessions).
export type Note = { id: string; lesson_date: string; body: string };
export type PastLesson = { started_at: string; minutes: number };
const SHOWN = 4;

const dateOf = (isoDate: string, locale: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function LessonNotes({ lessonId, notes, past }: { lessonId: string; notes: Note[]; past: PastLesson[] }) {
  const t = useT().plan;
  const locale = useLocale();
  const [all, setAll] = useState(false);
  const shown = all ? notes : notes.slice(0, SHOWN);
  return (
    <section aria-labelledby="lesson-notes" className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 id="lesson-notes" className="flex items-center gap-2 text-[22px] font-semibold tracking-tight">
          <NotebookPen size={20} aria-hidden className="text-accent" />
          {t.notes}
        </h2>
        <p className="text-sm text-ink-muted">{t.notesIntro}</p>
      </div>
      {notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-5 text-sm text-ink-muted">{t.noNotes}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((n) => (
            <NoteItem key={n.id} note={n} lessonId={lessonId} date={dateOf(n.lesson_date, locale)} />
          ))}
        </ul>
      )}
      {!all && notes.length > SHOWN && (
        <button type="button" onClick={() => setAll(true)} className="self-start text-sm font-medium text-accent hover:underline">
          {t.showAll(notes.length)}
        </button>
      )}
      {past.length > 0 && (
        <details className="group border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-muted select-none hover:text-ink">
            {t.pastLessons} ({past.length})
          </summary>
          <ul className="mt-2 flex flex-col text-sm">
            {past.map((p) => (
              <li key={p.started_at} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
                <time dateTime={p.started_at} suppressHydrationWarning>
                  {new Date(p.started_at).toLocaleString(locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <span className="text-ink-muted">{t.minutes(p.minutes)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function NoteItem({ note, lessonId, date }: { note: Note; lessonId: string; date: string }) {
  const t = useT().plan;
  const tc = useT().common;
  const [copied, setCopied] = useState(false);
  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";
  return (
    <li className="flex flex-col gap-2 rounded-md border border-line p-3.5" data-testid="lesson-note">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{date}</h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={t.copyNote}
            aria-label={t.copyNote}
            onClick={() => {
              void navigator.clipboard.writeText(note.body).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={iconButton}
          >
            {copied ? <Check size={16} aria-hidden className="text-ok" /> : <Copy size={16} aria-hidden />}
          </button>
          <a href={`/dashboard/${lessonId}/notes/${note.id}`} target="_blank" rel="noreferrer" title={t.printNote} aria-label={t.printNote} className={iconButton}>
            <Printer size={16} aria-hidden />
          </a>
          <form action={deleteLessonNote}>
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <SubmitButton
              variant="ghost"
              title={t.deleteNote(date)}
              aria-label={t.deleteNote(date)}
              className="h-9 w-9 p-0 text-ink-muted! hover:text-danger!"
              pending={<Trash2 size={16} aria-hidden className="opacity-50" />}
              confirm={t.deleteNoteConfirm(date)}
              confirmLabel={tc.delete}
            >
              <Trash2 size={16} aria-hidden />
            </SubmitButton>
          </form>
        </div>
      </div>
      <p className="line-clamp-6 text-[15px] leading-relaxed whitespace-pre-wrap">{note.body}</p>
    </li>
  );
}
