"use client";

import { ListChecks, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setQuizClassroom } from "@/app/(app)/dashboard/quiz/actions";
import { buttonClass } from "@/components/ui/Button";
import Portal from "@/components/ui/Portal";
import { useT } from "@/lib/i18n/client";

// A Classroom page: "Add a quiz" opens a list of her other quizzes (searchable when there are
// many), the same way as "Add from Library", instead of a browser dropdown.
export default function AddQuiz({ lessonId, quizzes }: { lessonId: string; quizzes: { id: string; title: string; ready: number }[] }) {
  const t = useT().quiz;
  const tl = useT().library;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const q = query.trim().toLocaleLowerCase();
  const shown = q ? quizzes.filter((x) => x.title.toLocaleLowerCase().includes(q)) : quizzes;

  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>("input, button[data-quiz]")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const add = (id: string) =>
    start(async () => {
      setFailed(false);
      if (!(await setQuizClassroom(id, lessonId, true))) return setFailed(true);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "sm", "h-10 gap-1.5 px-3.5 font-semibold")}>
        <Plus size={15} aria-hidden />
        {t.addQuizLabel}
      </button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={() => setOpen(false)}>
            <div
              ref={box}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-quiz-title"
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[min(560px,90dvh)] w-full max-w-[420px] flex-col gap-3 rounded-panel bg-surface p-5 text-ink shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 id="add-quiz-title" className="text-[18px] font-semibold">
                  {t.addQuizLabel}
                </h2>
                <button type="button" onClick={() => setOpen(false)} aria-label={tl.close} className={buttonClass("ghost", "sm", "h-9 w-9 shrink-0 px-0! text-ink!")}>
                  <X size={18} aria-hidden />
                </button>
              </div>
              {quizzes.length > 6 && (
                <label className="relative">
                  <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.findQuiz}
                    aria-label={t.findQuiz}
                    className="h-10 w-full rounded-md border border-line bg-surface pr-3 pl-9 text-[15px] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                  />
                </label>
              )}
              <ul className="-mx-1 flex-1 overflow-y-auto px-1">
                {shown.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      data-quiz
                      disabled={pending}
                      onClick={() => add(x.id)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marker-soft text-marker-ink">
                        <ListChecks size={15} aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">{x.title}</span>
                        <span className="text-[13px] text-ink-muted">{t.questionCount(x.ready)}</span>
                      </span>
                      <Plus size={16} aria-hidden className="shrink-0 text-accent" />
                    </button>
                  </li>
                ))}
                {!shown.length && <li className="px-2 py-3 text-sm text-ink-muted">{t.noQuizMatch}</li>}
              </ul>
              {failed && (
                <p role="alert" className="text-sm text-danger">
                  {tl.failed}
                </p>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
