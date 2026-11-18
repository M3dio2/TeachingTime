"use client";

import { Check, CircleAlert, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { saveQuizResult } from "@/app/(app)/dashboard/quiz/actions";
import Chip from "@/components/ui/Chip";
import Marker from "@/components/ui/Marker";
import { useT } from "@/lib/i18n/client";
import { type Answer, type Checked, checkQuestion, type PublicQuestion, playable, score } from "@/lib/quiz";
import { publishQuiz, resetQuiz, setAnswer, setChecked, setDone, useQuizState } from "@/lib/room/quizDoc";
import { type FileTab, resourceIdOf } from "@/lib/room/tabs";
import { cap, type RoomModel } from "./roomModel";

// Q1: a quiz on the stage. Both see the same questions and answers live; the student answers
// (the teacher may too), presses "I'm done", the teacher checks, and both see what was right.
export default function QuizPane({ id, model }: { id: FileTab; model: RoomModel }) {
  const t = useT().quiz;
  const quizId = resourceIdOf(id);
  const teacher = model.role === "teacher";
  const full = model.files?.find((f) => f.kind === "quiz" && f.id === quizId)?.quiz;
  const state = useQuizState(model.quizDoc, quizId);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  // Teacher: the questions (without answers) go into the shared doc for the student.
  useEffect(() => {
    if (teacher && full) publishQuiz(model.quizDoc, full);
  }, [teacher, full, model.quizDoc]);

  if (!state.questions) return <p className="p-6 text-ink-muted">{t.loadingQuiz}</p>;
  const questions = state.questions;
  if (!questions.length) return <p className="p-6 text-ink-muted">{t.emptyQuiz}</p>;

  const checked = state.checked;
  const answered = questions.filter((q) => isAnswered(q, state.answers[q.id])).length;
  const result = checked ? score(questions.map((q) => checked[q.id]).filter(Boolean)) : null;

  const check = async () => {
    if (!full) return;
    const questionsById = new Map(playable(full.questions).map((q) => [q.id, q]));
    const next: Record<string, Checked> = {};
    for (const q of questions) {
      const fullQ = questionsById.get(q.id);
      if (fullQ) next[q.id] = checkQuestion(fullQ, state.answers[q.id] ?? null);
    }
    setChecked(model.quizDoc, quizId, next);
    const { right, total } = score(Object.values(next));
    if (!model.lessonId || !total) return;
    setSaved("saving");
    const ok = await saveQuizResult({
      lessonId: model.lessonId,
      quizId,
      quizTitle: full.title,
      score: right,
      total,
      answers: questions.map((q) => ({ id: q.id, answer: state.answers[q.id] ?? null, checked: next[q.id] ?? null })),
    }).catch(() => false);
    setSaved(ok ? "saved" : "failed");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper" data-testid="quiz" data-checked={checked ? "yes" : "no"}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 p-4 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="truncate font-display text-2xl leading-tight font-extrabold tracking-[-0.01em]">{state.title}</h2>
              <span className="text-sm text-ink-muted">{t.progress(answered, questions.length)}</span>
            </div>
            <Chip tone={teacher ? undefined : "ok"}>{teacher ? t.answering(cap(model.otherName)) : t.youAnswer}</Chip>
          </header>
          <ol className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionView
                key={q.id}
                n={i + 1}
                q={q}
                answer={state.answers[q.id] ?? null}
                checked={checked?.[q.id]}
                onAnswer={(a) => setAnswer(model.quizDoc, quizId, q.id, a)}
              />
            ))}
          </ol>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3">
        {result ? (
          <>
            <span className="relative isolate px-1 font-display text-xl font-extrabold" data-testid="quiz-result">
              {t.result(result.right, result.total)}
              <Marker
                shape="circle"
                width={2.2}
                delay={0.1}
                className="absolute -top-2 -left-3 h-[calc(100%+1rem)] w-[calc(100%+1.5rem)]"
              />
            </span>
            {teacher && (
              <div className="flex items-center gap-3">
                {saved === "saved" && (
                  <span className="flex items-center gap-1 text-[13px] text-ink-muted">
                    <Check size={14} aria-hidden className="text-ok" />
                    {t.resultSaved(model.otherName)}
                  </span>
                )}
                {saved === "failed" && (
                  <span className="flex items-center gap-1 text-[13px] text-danger">
                    <CircleAlert size={14} aria-hidden />
                    {t.resultNotSaved}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetQuiz(model.quizDoc, quizId);
                    setSaved("idle");
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line px-3.5 text-sm font-semibold hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <RotateCcw size={16} aria-hidden />
                  {t.tryAgain}
                </button>
              </div>
            )}
          </>
        ) : teacher ? (
          <>
            <span className="text-sm text-ink-muted">
              {state.done ? <strong className="text-ink">{t.studentDone(cap(model.otherName))}</strong> : t.progress(answered, questions.length)}
            </span>
            <button
              type="button"
              onClick={check}
              disabled={!full}
              className={`inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60 ${
                state.done ? "bg-accent text-white hover:bg-accent-hover" : "border border-line hover:bg-surface-2"
              }`}
            >
              <Check size={16} aria-hidden />
              {t.checkAnswers}
            </button>
          </>
        ) : state.done ? (
          <span className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Check size={16} aria-hidden className="text-ok" />
            {t.doneSent(cap(model.otherName))}
          </span>
        ) : (
          <>
            <span className="text-sm text-ink-muted">{t.progress(answered, questions.length)}</span>
            <button
              type="button"
              onClick={() => setDone(model.quizDoc, quizId, true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <Check size={16} aria-hidden />
              {t.done}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function isAnswered(q: PublicQuestion, a: Answer) {
  if (q.type === "choice") return typeof a === "number";
  return Array.isArray(a) && a.some((s) => s.trim());
}

const LETTERS = "ABCDEFGH";

function QuestionView({
  n,
  q,
  answer,
  checked,
  onAnswer,
}: {
  n: number;
  q: PublicQuestion;
  answer: Answer;
  checked?: Checked;
  onAnswer: (a: Answer) => void;
}) {
  const t = useT().quiz;
  const locked = Boolean(checked);
  const allRight = checked ? (checked.type === "choice" ? checked.right : checked.right.every(Boolean)) : null;
  return (
    <li
      aria-label={t.question(n)}
      data-result={allRight === null ? undefined : allRight ? "right" : "wrong"}
      className={`flex flex-col gap-3 rounded-panel border bg-surface p-4 md:p-5 ${
        allRight === null ? "border-line" : allRight ? "border-ok" : "border-danger"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-marker-soft px-1.5 font-display text-sm font-extrabold text-marker-ink">
          {n}
        </span>
        {q.prompt && <p className="pt-0.5 text-[17px] leading-snug font-semibold">{q.prompt}</p>}
        {allRight !== null && (
          <span className={`ml-auto flex shrink-0 items-center gap-1 pt-1 text-sm font-semibold ${allRight ? "text-ok" : "text-danger"}`}>
            {allRight ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
            {allRight ? t.rightAnswer : t.wrongAnswer}
          </span>
        )}
      </div>

      {q.type === "choice" ? (
        <div role="radiogroup" aria-label={q.prompt || t.question(n)} className="flex flex-col gap-2">
          {q.options.map((o, i) => {
            const chosen = answer === i;
            const solution = checked?.type === "choice" && checked.solution === i;
            const tone = checked ? (solution ? "right" : chosen ? "wrong" : "plain") : chosen ? "chosen" : "plain";
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={locked}
                onClick={() => onAnswer(i)}
                className={`flex min-h-12 items-center gap-3 rounded-md border-[1.5px] px-3 py-2 text-left text-[15px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  {
                    chosen: "border-accent bg-marker-soft font-semibold",
                    right: "border-ok bg-ok/10 font-semibold",
                    wrong: "border-danger bg-danger-soft",
                    plain: `border-line ${locked ? "opacity-70" : "hover:border-accent hover:bg-paper"}`,
                  }[tone]
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    tone === "chosen" ? "bg-accent text-white" : tone === "right" ? "bg-ok text-white" : tone === "wrong" ? "bg-danger text-white" : "bg-surface-2 text-ink-muted"
                  }`}
                >
                  {tone === "right" ? <Check size={14} strokeWidth={3} aria-hidden /> : tone === "wrong" ? <X size={14} strokeWidth={3} aria-hidden /> : LETTERS[i]}
                </span>
                <span className="min-w-0">{o}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <GapText q={q} answer={answer} checked={checked?.type === "gap" ? checked : undefined} onAnswer={onAnswer} />
      )}
    </li>
  );
}

function GapText({
  q,
  answer,
  checked,
  onAnswer,
}: {
  q: Extract<PublicQuestion, { type: "gap" }>;
  answer: Answer;
  checked?: Extract<Checked, { type: "gap" }>;
  onAnswer: (a: Answer) => void;
}) {
  const t = useT().quiz;
  const gaps = q.parts.filter((p) => p === null).length;
  const values = Array.from({ length: gaps }, (_, i) => (Array.isArray(answer) ? (answer[i] ?? "") : ""));
  let gap = -1;
  return (
    <p className="text-[17px] leading-[2.4]">
      {q.parts.map((p, i) => {
        if (p !== null) return <span key={i} className="whitespace-pre-wrap">{p}</span>;
        const g = ++gap;
        const right = checked?.right[g];
        return (
          <span key={i} className="mx-0.5 inline-flex flex-col align-baseline leading-none">
            <input
              value={values[g]}
              aria-label={t.gapLabel(g + 1)}
              disabled={Boolean(checked)}
              size={Math.max(6, values[g].length + 1)}
              maxLength={100}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => onAnswer(values.map((v, j) => (j === g ? e.target.value : v)))}
              className={`h-9 rounded-md border-0 border-b-2 px-2 text-center text-[17px] font-semibold text-ink focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                checked === undefined
                  ? "border-accent bg-paper"
                  : right
                    ? "border-ok bg-ok/10"
                    : "border-danger bg-danger-soft"
              }`}
            />
            {checked && !right && (
              <span className="mt-1 text-center text-[13px] font-semibold text-ok">{checked.solution[g]}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}
