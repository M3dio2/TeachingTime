"use client";

import { ArrowDown, ArrowUp, Check, CircleAlert, Copy, ListChecks, Plus, TextCursorInput, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deleteQuiz, duplicateQuiz, saveQuiz } from "@/app/(app)/dashboard/quiz/actions";
import { inputClass } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import SubmitButton from "@/components/ui/SubmitButton";
import { useT } from "@/lib/i18n/client";
import {
  type ChoiceQuestion,
  emptyChoice,
  emptyGap,
  type GapQuestion,
  MAX_GAP_TEXT,
  MAX_OPTION,
  MAX_OPTIONS,
  MAX_PROMPT,
  MAX_QUESTIONS,
  MAX_TITLE,
  MIN_OPTIONS,
  parseGaps,
  type Question,
  questionProblem,
  type Quiz,
} from "@/lib/quiz";

const SAVE_AFTER_MS = 700;
type SaveState = "saved" | "saving" | "failed";

// Q1: the quiz editor. Every change is saved a moment later (no Save button); the status sits
// next to the title. Incomplete questions are kept but not shown in lessons.
export default function QuizEditor({ quiz }: { quiz: Quiz }) {
  const t = useT().quiz;
  const [title, setTitle] = useState(quiz.title);
  const [questions, setQuestions] = useState<Question[]>(quiz.questions);
  const [state, setState] = useState<SaveState>("saved");
  const [version, setVersion] = useState(0); // bumps on each edit
  const latest = useRef({ title, questions });

  const edit = (next: { title?: string; questions?: Question[] }) => {
    if (next.title !== undefined) setTitle(next.title);
    if (next.questions) setQuestions(next.questions);
    latest.current = { title: next.title ?? title, questions: next.questions ?? questions };
    setState("saving");
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    if (version === 0) return;
    const timer = setTimeout(async () => {
      const { title, questions } = latest.current;
      const ok = await saveQuiz(quiz.id, title, questions).catch(() => false);
      // Only the newest edit decides the status.
      if (latest.current.title === title && latest.current.questions === questions) setState(ok ? "saved" : "failed");
    }, SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [version, quiz.id]);

  // Leaving while a change isn't saved yet: the browser asks first.
  useEffect(() => {
    if (state === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  const setQuestion = (i: number, q: Question) => edit({ questions: questions.map((old, j) => (j === i ? q : old)) });
  const move = (i: number, by: number) => {
    const next = [...questions];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    edit({ questions: next });
  };
  const add = (q: Question) => edit({ questions: [...questions, q] });

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quiz-title" className="text-sm font-medium text-ink-muted">
            {t.titleLabel}
          </label>
          <input
            id="quiz-title"
            value={title}
            maxLength={MAX_TITLE}
            placeholder={t.titlePlaceholder}
            onChange={(e) => edit({ title: e.target.value })}
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 -mx-2 font-display text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em] text-ink placeholder:text-ink-muted/60 hover:border-line focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none md:text-4xl"
          />
          <SaveStatus state={state} />
        </div>

        <ol className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              n={i + 1}
              q={q}
              onChange={(next) => setQuestion(i, next)}
              onMoveUp={i > 0 ? () => move(i, -1) : undefined}
              onMoveDown={i < questions.length - 1 ? () => move(i, 1) : undefined}
              onRemove={() => edit({ questions: questions.filter((_, j) => j !== i) })}
            />
          ))}
        </ol>

        {questions.length < MAX_QUESTIONS ? (
          <div className="flex flex-wrap items-center gap-2 rounded-panel border-[1.5px] border-dashed border-line p-3">
            <span className="px-1 text-sm font-medium text-ink-muted">{t.addQuestion}</span>
            <AddButton icon={<ListChecks size={16} aria-hidden />} label={t.addChoice} onClick={() => add(emptyChoice())} />
            <AddButton icon={<TextCursorInput size={16} aria-hidden />} label={t.addGap} onClick={() => add(emptyGap())} />
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t.maxQuestions(MAX_QUESTIONS)}</p>
        )}
      </div>

      <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 md:sticky md:top-6 md:max-w-[320px]">
        <section className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-5">
          <p className="text-sm leading-relaxed text-ink-muted">{t.howItWorks}</p>
        </section>
        <div className="flex flex-wrap gap-2">
          <form action={duplicateQuiz}>
            <input type="hidden" name="id" value={quiz.id} />
            <SubmitButton variant="secondary" size="sm" className="h-9" pending={t.creating}>
              <Copy size={16} aria-hidden />
              {t.duplicate}
            </SubmitButton>
          </form>
          <form
            action={deleteQuiz}
            onSubmit={(e) => {
              if (!confirm(t.deleteConfirm(title || t.untitled))) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={quiz.id} />
            <input type="hidden" name="then" value="dashboard" />
            <SubmitButton variant="ghost" size="sm" className="h-9 text-danger!" pending={t.deleting}>
              <Trash2 size={16} aria-hidden />
              {t.deleteQuiz}
            </SubmitButton>
          </form>
        </div>
      </aside>
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  const t = useT().quiz;
  return (
    <p role="status" className={`flex items-center gap-1.5 text-[13px] ${state === "failed" ? "text-danger" : "text-ink-muted"}`}>
      {state === "saved" && <Check size={14} aria-hidden className="text-ok" />}
      {state === "failed" && <CircleAlert size={14} aria-hidden />}
      {state === "saved" ? t.saved : state === "saving" ? t.savingChanges : t.notSaved}
    </p>
  );
}

function AddButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Plus size={16} aria-hidden className="text-accent" />
      {icon}
      {label}
    </button>
  );
}

const iconButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-30 disabled:hover:bg-transparent";

function QuestionCard({
  n,
  q,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  n: number;
  q: Question;
  onChange: (q: Question) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}) {
  const t = useT().quiz;
  const problem = questionProblem(q);
  // Switching the type keeps the question's text where it fits.
  const switchType = (type: string) => {
    if (type === q.type) return;
    onChange(type === "gap" ? { ...emptyGap(), id: q.id, prompt: q.prompt } : { ...emptyChoice(), id: q.id, prompt: q.prompt });
  };
  return (
    <li aria-label={t.question(n)} className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-marker-soft px-2 font-display text-sm font-extrabold text-marker-ink">
          {n}
        </span>
        <div className="max-w-[340px] min-w-[240px] flex-1">
          <Segmented
            label={t.typeLabel}
            value={q.type}
            onChange={switchType}
            segments={[
              { id: "choice", label: t.typeChoice },
              { id: "gap", label: t.typeGap },
            ]}
          />
        </div>
        <span className="flex-1" />
        <div className="flex items-center">
          <button type="button" className={iconButton} aria-label={t.moveUp} title={t.moveUp} disabled={!onMoveUp} onClick={onMoveUp}>
            <ArrowUp size={16} aria-hidden />
          </button>
          <button type="button" className={iconButton} aria-label={t.moveDown} title={t.moveDown} disabled={!onMoveDown} onClick={onMoveDown}>
            <ArrowDown size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={`${iconButton} hover:text-danger!`}
            aria-label={t.removeQuestion}
            title={t.removeQuestion}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>

      {q.type === "choice" ? <ChoiceFields q={q} onChange={onChange} /> : <GapFields q={q} onChange={onChange} />}

      {problem && (
        <p className="flex items-start gap-1.5 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn">
          <CircleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            {t.problems[problem]} {t.notInLesson}
          </span>
        </p>
      )}
    </li>
  );
}

function ChoiceFields({ q, onChange }: { q: ChoiceQuestion; onChange: (q: Question) => void }) {
  const t = useT().quiz;
  const setOption = (i: number, text: string) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? text : o)) });
  const removeOption = (i: number) =>
    onChange({
      ...q,
      options: q.options.filter((_, j) => j !== i),
      correct: q.correct === i ? 0 : q.correct > i ? q.correct - 1 : q.correct,
    });
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t.promptLabel}
        <input
          value={q.prompt}
          maxLength={MAX_PROMPT}
          placeholder={t.promptPlaceholder}
          onChange={(e) => onChange({ ...q, prompt: e.target.value })}
          className={inputClass()}
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">
          {t.answersLabel} <span className="font-normal text-ink-muted">· {t.answersHint}</span>
        </legend>
        {q.options.map((o, i) => {
          const right = q.correct === i;
          return (
            <div key={i} className={`flex items-center gap-2 rounded-md border p-1.5 pl-2 ${right ? "border-ok bg-ok/5" : "border-line"}`}>
              <button
                type="button"
                role="radio"
                aria-checked={right}
                aria-label={t.markRight(i + 1)}
                title={t.markRight(i + 1)}
                onClick={() => onChange({ ...q, correct: i })}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  right ? "border-ok bg-ok text-white" : "border-line text-transparent hover:border-ok"
                }`}
              >
                <Check size={14} strokeWidth={3} aria-hidden />
              </button>
              <input
                value={o}
                maxLength={MAX_OPTION}
                placeholder={t.answerPlaceholder(i + 1)}
                aria-label={t.answerPlaceholder(i + 1)}
                onChange={(e) => setOption(i, e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border-0 bg-transparent px-1.5 text-base text-ink placeholder:text-ink-muted focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
              />
              {q.options.length > MIN_OPTIONS && (
                <button type="button" className={iconButton} aria-label={t.removeAnswer(i + 1)} title={t.removeAnswer(i + 1)} onClick={() => removeOption(i)}>
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
          );
        })}
        {q.options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => onChange({ ...q, options: [...q.options, ""] })}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-md px-2 text-sm font-semibold text-accent hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Plus size={16} aria-hidden />
            {t.addAnswer}
          </button>
        )}
      </fieldset>
    </>
  );
}

function GapFields({ q, onChange }: { q: GapQuestion; onChange: (q: Question) => void }) {
  const t = useT().quiz;
  const parts = parseGaps(q.text);
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t.instructionLabel}
        <input
          value={q.prompt}
          maxLength={MAX_PROMPT}
          placeholder={t.instructionPlaceholder}
          onChange={(e) => onChange({ ...q, prompt: e.target.value })}
          className={inputClass()}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t.gapTextLabel}
        <textarea
          value={q.text}
          maxLength={MAX_GAP_TEXT}
          rows={3}
          placeholder={t.gapTextPlaceholder}
          onChange={(e) => onChange({ ...q, text: e.target.value })}
          className={`${inputClass()} h-auto resize-y py-2 leading-relaxed`}
        />
        <span className="text-[13px] font-normal text-ink-muted">{t.gapHint}</span>
      </label>
      {parts.some(Array.isArray) && (
        <div className="flex flex-col gap-1.5 rounded-md bg-paper p-3">
          <span className="text-[13px] font-medium text-ink-muted">{t.preview}</span>
          <p className="leading-[2.1]">
            {parts.map((p, i) =>
              Array.isArray(p) ? (
                <span
                  key={i}
                  className="mx-0.5 inline-block min-w-16 rounded border-b-2 border-accent bg-surface px-2 text-center text-ink-muted"
                  title={p.join(" / ")}
                >
                  {"\u00a0"}
                </span>
              ) : (
                <span key={i} className="whitespace-pre-wrap">
                  {p}
                </span>
              ),
            )}
          </p>
        </div>
      )}
    </>
  );
}
