"use client";

import { Check, CircleAlert, Lightbulb, RotateCcw, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { saveQuizResult } from "@/app/(app)/dashboard/quiz/actions";
import { TYPE_ICONS } from "@/components/quiz/QuestionTypes";
import Chip from "@/components/ui/Chip";
import Marker from "@/components/ui/Marker";
import { useT } from "@/lib/i18n/client";
import { type Answer, type Checked, checkQuestion, isAnswered, type PublicQuestion, playable, score } from "@/lib/quiz";
import { publishQuiz, resetQuiz, setAnswer, setChecked, setDone, setMark, useQuizState } from "@/lib/room/quizDoc";
import { type FileTab, resourceIdOf } from "@/lib/room/tabs";
import { cap, type RoomModel } from "./roomModel";

type Of<T extends PublicQuestion["type"]> = Extract<PublicQuestion, { type: T }>;
type CheckedOf<T extends Checked["type"]> = Extract<Checked, { type: T }>;
const LETTERS = "ABCDEFGHIJ";

// Q1: a quiz on the stage. Both see the same questions and answers live; the student answers
// (the teacher may too), presses "I'm done", the teacher marks open answers and checks, and
// both see what was right. Everything is tap-only, so it works the same on phones.
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
  if (!questions.length) return <p className="p-6 text-ink-muted">{t.emptyInLesson}</p>;

  const checked = state.checked;
  const answered = questions.filter((q) => isAnswered(q, state.answers[q.id] ?? null)).length;
  const result = checked ? score(questions.map((q) => checked[q.id]).filter(Boolean)) : null;
  const unmarked = questions.some((q) => q.type === "open" && state.marks[q.id] === undefined);

  const check = async () => {
    if (!full) return;
    const byId = new Map(playable(full.questions).map((q) => [q.id, q]));
    const next: Record<string, Checked> = {};
    for (const q of questions) {
      const fullQ = byId.get(q.id);
      if (fullQ) next[q.id] = checkQuestion(fullQ, state.answers[q.id] ?? null, state.marks[q.id]);
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
                teacher={teacher}
                answer={state.answers[q.id] ?? null}
                mark={state.marks[q.id]}
                checked={checked?.[q.id]}
                onAnswer={(a) => setAnswer(model.quizDoc, quizId, q.id, a)}
                onMark={(right) => setMark(model.quizDoc, quizId, q.id, right)}
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
              <Marker shape="circle" width={2.2} delay={0.1} className="absolute -top-2 -left-3 h-[calc(100%+1rem)] w-[calc(100%+1.5rem)]" />
            </span>
            {teacher && (
              <div className="flex flex-wrap items-center gap-3">
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
              {unmarked ? t.markFirst : state.done ? <strong className="text-ink">{t.studentDone(cap(model.otherName))}</strong> : t.progress(answered, questions.length)}
            </span>
            <button
              type="button"
              onClick={check}
              disabled={!full || unmarked}
              className={`inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50 ${
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

const wholeRight = (c: Checked) => (Array.isArray(c.right) ? c.right.every(Boolean) : c.right);

function QuestionView({
  n,
  q,
  teacher,
  answer,
  mark,
  checked,
  onAnswer,
  onMark,
}: {
  n: number;
  q: PublicQuestion;
  teacher: boolean;
  answer: Answer;
  mark?: boolean;
  checked?: Checked;
  onAnswer: (a: Answer) => void;
  onMark: (right: boolean) => void;
}) {
  const t = useT().quiz;
  const [hintShown, setHintShown] = useState(false);
  const right = checked ? wholeRight(checked) : null;
  const Icon = TYPE_ICONS[q.type];
  const locked = Boolean(checked);
  const body: Record<PublicQuestion["type"], () => ReactNode> = {
    choice: () => <ChoiceView q={q as Of<"choice">} answer={answer} checked={checked as CheckedOf<"choice">} locked={locked} onAnswer={onAnswer} />,
    truefalse: () => <TrueFalseView answer={answer} checked={checked as CheckedOf<"truefalse">} locked={locked} onAnswer={onAnswer} />,
    gap: () => <GapView q={q as Of<"gap">} answer={answer} checked={checked as CheckedOf<"gap">} onAnswer={onAnswer} />,
    select: () => <SelectView q={q as Of<"select">} answer={answer} checked={checked as CheckedOf<"select">} onAnswer={onAnswer} />,
    match: () => <MatchView q={q as Of<"match">} answer={answer} checked={checked as CheckedOf<"match">} locked={locked} onAnswer={onAnswer} />,
    order: () => <OrderView q={q as Of<"order">} answer={answer} checked={checked as CheckedOf<"order">} locked={locked} onAnswer={onAnswer} />,
    open: () => <OpenView teacher={teacher} answer={answer} mark={mark} locked={locked} onAnswer={onAnswer} onMark={onMark} />,
  };
  return (
    <li
      aria-label={t.question(n)}
      data-result={right === null ? undefined : right ? "right" : "wrong"}
      className={`flex flex-col gap-3 rounded-panel border bg-surface p-4 md:p-5 ${right === null ? "border-line" : right ? "border-ok" : "border-danger"}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-marker-soft px-1.5 font-display text-sm font-extrabold text-marker-ink">
          {n}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
          {q.prompt && <p className="text-[17px] leading-snug font-semibold">{q.prompt}</p>}
          {q.type === "choice" && q.multi && !locked && <span className="text-[13px] text-ink-muted">{t.chooseAll}</span>}
          {q.type === "match" && !locked && <span className="text-[13px] text-ink-muted">{t.matchHelp}</span>}
          {q.type === "order" && !locked && <span className="text-[13px] text-ink-muted">{t.orderHelp}</span>}
        </div>
        {right !== null ? (
          <span className={`flex shrink-0 items-center gap-1 pt-1 text-sm font-semibold ${right ? "text-ok" : "text-danger"}`}>
            {right ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
            {right ? t.rightAnswer : t.wrongAnswer}
          </span>
        ) : (
          <Icon size={16} aria-hidden className="mt-1.5 shrink-0 text-ink-muted" />
        )}
      </div>

      {body[q.type]()}

      {q.hint && !locked &&
        (teacher || hintShown ? (
          <p className="flex items-start gap-1.5 rounded-md bg-marker-soft/60 px-3 py-2 text-sm text-marker-ink">
            <Lightbulb size={15} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              <strong>{t.hint}:</strong> {q.hint}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setHintShown(true)}
            className="inline-flex h-8 items-center gap-1.5 self-start rounded-md px-2 text-sm font-semibold text-accent hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Lightbulb size={15} aria-hidden />
            {t.showHint}
          </button>
        ))}
      {checked?.explanation && (
        <p className="rounded-md bg-paper px-3 py-2 text-sm leading-relaxed text-ink">{checked.explanation}</p>
      )}
    </li>
  );
}

// A big tappable answer: plain, chosen, right or wrong.
type Tone = "plain" | "chosen" | "right" | "wrong";
const toneClass: Record<Tone, string> = {
  chosen: "border-accent bg-marker-soft font-semibold",
  right: "border-ok bg-ok/10 font-semibold",
  wrong: "border-danger bg-danger-soft",
  plain: "border-line",
};
const badgeClass: Record<Tone, string> = {
  chosen: "bg-accent text-white",
  right: "bg-ok text-white",
  wrong: "bg-danger text-white",
  plain: "bg-surface-2 text-ink-muted",
};
function Option({
  tone,
  badge,
  locked,
  role,
  checked,
  onClick,
  children,
  className = "",
}: {
  tone: Tone;
  badge?: ReactNode;
  locked: boolean;
  role: "radio" | "checkbox" | "button";
  checked?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "button" ? undefined : checked}
      aria-pressed={role === "button" ? checked : undefined}
      disabled={locked}
      onClick={onClick}
      className={`flex min-h-12 items-center gap-3 rounded-md border-[1.5px] px-3 py-2 text-left text-[15px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${toneClass[tone]} ${
        tone === "plain" ? (locked ? "opacity-70" : "hover:border-accent hover:bg-paper") : ""
      } ${className}`}
    >
      {badge !== undefined && (
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${badgeClass[tone]}`}>
          {tone === "right" ? <Check size={14} strokeWidth={3} aria-hidden /> : tone === "wrong" ? <X size={14} strokeWidth={3} aria-hidden /> : badge}
        </span>
      )}
      <span className="min-w-0">{children}</span>
    </button>
  );
}

function ChoiceView({ q, answer, checked, locked, onAnswer }: { q: Of<"choice">; answer: Answer; checked?: CheckedOf<"choice">; locked: boolean; onAnswer: (a: Answer) => void }) {
  const chosen = Array.isArray(answer) ? (answer as number[]) : [];
  return (
    <div role={q.multi ? "group" : "radiogroup"} aria-label={q.prompt} className="flex flex-col gap-2">
      {q.options.map((o, i) => {
        const on = chosen.includes(i);
        const solution = checked?.solution.includes(i);
        const tone: Tone = checked ? (solution ? "right" : on ? "wrong" : "plain") : on ? "chosen" : "plain";
        return (
          <Option
            key={i}
            tone={tone}
            badge={LETTERS[i]}
            locked={locked}
            role={q.multi ? "checkbox" : "radio"}
            checked={on}
            onClick={() => onAnswer(q.multi ? (on ? chosen.filter((c) => c !== i) : [...chosen, i]) : [i])}
          >
            {o}
          </Option>
        );
      })}
    </div>
  );
}

function TrueFalseView({ answer, checked, locked, onAnswer }: { answer: Answer; checked?: CheckedOf<"truefalse">; locked: boolean; onAnswer: (a: Answer) => void }) {
  const t = useT().quiz;
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {[true, false].map((v) => {
        const on = answer === v;
        const tone: Tone = checked ? (checked.solution === v ? "right" : on ? "wrong" : "plain") : on ? "chosen" : "plain";
        return (
          <Option key={String(v)} tone={tone} locked={locked} role="radio" checked={on} onClick={() => onAnswer(v)} className="justify-center text-base font-bold">
            {v ? `✓ ${t.isTrue}` : `✗ ${t.isFalse}`}
          </Option>
        );
      })}
    </div>
  );
}

function GapView({ q, answer, checked, onAnswer }: { q: Of<"gap">; answer: Answer; checked?: CheckedOf<"gap">; onAnswer: (a: Answer) => void }) {
  const t = useT().quiz;
  const gaps = q.parts.filter((p) => p === null).length;
  const values = Array.from({ length: gaps }, (_, i) => (Array.isArray(answer) ? String(answer[i] ?? "") : ""));
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
                checked === undefined ? "border-accent bg-paper" : right ? "border-ok bg-ok/10" : "border-danger bg-danger-soft"
              }`}
            />
            {checked && !right && <span className="mt-1 text-center text-[13px] font-semibold text-ok">{checked.solution[g]}</span>}
          </span>
        );
      })}
    </p>
  );
}

function SelectView({ q, answer, checked, onAnswer }: { q: Of<"select">; answer: Answer; checked?: CheckedOf<"select">; onAnswer: (a: Answer) => void }) {
  const t = useT().quiz;
  const values = q.choices.map((_, i) => (Array.isArray(answer) ? Number(answer[i] ?? -1) : -1));
  let gap = -1;
  return (
    <p className="text-[17px] leading-[2.4]">
      {q.parts.map((p, i) => {
        if (p !== null) return <span key={i} className="whitespace-pre-wrap">{p}</span>;
        const g = ++gap;
        const right = checked?.right[g];
        return (
          <span key={i} className="mx-0.5 inline-flex flex-col align-baseline leading-none">
            <select
              value={values[g]}
              aria-label={t.gapLabel(g + 1)}
              disabled={Boolean(checked)}
              onChange={(e) => onAnswer(values.map((v, j) => (j === g ? Number(e.target.value) : v)))}
              className={`h-9 rounded-md border-0 border-b-2 px-2 text-[17px] font-semibold text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                checked === undefined ? "border-accent bg-paper" : right ? "border-ok bg-ok/10" : "border-danger bg-danger-soft"
              } ${values[g] === -1 ? "text-ink-muted" : ""}`}
            >
              <option value={-1} disabled>
                {t.choose} ▾
              </option>
              {q.choices[g].map((c, j) => (
                <option key={j} value={j}>
                  {c}
                </option>
              ))}
            </select>
            {checked && !right && <span className="mt-1 text-center text-[13px] font-semibold text-ok">{q.choices[g][checked.solution[g]]}</span>}
          </span>
        );
      })}
    </p>
  );
}

function MatchView({ q, answer, checked, locked, onAnswer }: { q: Of<"match">; answer: Answer; checked?: CheckedOf<"match">; locked: boolean; onAnswer: (a: Answer) => void }) {
  const t = useT().quiz;
  const pairs = q.lefts.map((_, i) => (Array.isArray(answer) ? Number(answer[i] ?? -1) : -1));
  const [picked, setPicked] = useState<number | null>(null);
  const leftOf = (r: number) => pairs.indexOf(r);
  const tapLeft = (l: number) => {
    if (pairs[l] >= 0) onAnswer(pairs.map((p, i) => (i === l ? -1 : p))); // undo
    setPicked(picked === l ? null : l);
  };
  const tapRight = (r: number) => {
    if (picked === null) {
      const l = leftOf(r);
      if (l >= 0) onAnswer(pairs.map((p, i) => (i === l ? -1 : p))); // undo from the right
      return;
    }
    onAnswer(pairs.map((p, i) => (i === picked ? r : p === r ? -1 : p)));
    setPicked(null);
  };
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {q.lefts.map((left, l) => {
        const r = pairs[l];
        const tone: Tone = checked ? (checked.right[l] ? "right" : "wrong") : picked === l ? "chosen" : "plain";
        return (
          <div key={`l${l}`} className="col-start-1 flex flex-col" style={{ gridRow: l + 1 }}>
            <Option tone={tone} locked={locked} role="button" checked={picked === l} onClick={() => tapLeft(l)} badge={r >= 0 && !checked ? LETTERS[l] : undefined}>
              {left}
            </Option>
            {checked && !checked.right[l] && <span className="mt-1 text-[13px] font-semibold text-ok">↔ {q.rights[checked.solution[l]]}</span>}
          </div>
        );
      })}
      {q.rights.map((right, r) => {
        const l = leftOf(r);
        const tone: Tone = checked ? "plain" : l >= 0 ? "chosen" : "plain";
        return (
          <div key={`r${r}`} className="col-start-2 flex flex-col" style={{ gridRow: r + 1 }}>
            <Option
              tone={tone}
              locked={locked}
              role="button"
              checked={l >= 0}
              onClick={() => tapRight(r)}
              badge={l >= 0 ? LETTERS[l] : undefined}
              className={tone === "chosen" ? "bg-surface-2! font-medium!" : ""}
            >
              <span aria-label={l >= 0 ? `${right}, ${t.pairLetter(LETTERS[l])}` : undefined}>{right}</span>
            </Option>
          </div>
        );
      })}
    </div>
  );
}

function OrderView({ q, answer, checked, locked, onAnswer }: { q: Of<"order">; answer: Answer; checked?: CheckedOf<"order">; locked: boolean; onAnswer: (a: Answer) => void }) {
  const t = useT().quiz;
  const chosen = Array.isArray(answer) ? (answer as number[]) : [];
  const list = q.joiner === "\n";
  const tile = (i: number, onClick: () => void, faded = false) => (
    <button
      key={i}
      type="button"
      disabled={locked}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center rounded-md border-[1.5px] border-line bg-surface px-3 text-[15px] font-medium shadow-[0_1px_0_var(--color-line)] hover:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:hover:border-line ${
        list ? "w-full text-left" : ""
      } ${faded ? "opacity-0" : ""}`}
    >
      {q.tiles[i]}
    </button>
  );
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-label={t.yourOrder}
        className={`flex min-h-14 flex-wrap content-start gap-1.5 rounded-md border-b-2 p-2 ${
          checked ? (checked.right ? "border-ok bg-ok/10" : "border-danger bg-danger-soft") : "border-accent bg-paper"
        } ${list ? "flex-col" : ""}`}
      >
        {chosen.map((i) => tile(i, () => onAnswer(chosen.filter((c) => c !== i))))}
      </div>
      {!checked && (
        <div aria-label={t.pieces} className={`flex flex-wrap gap-1.5 ${list ? "flex-col" : ""}`}>
          {q.tiles.map((_, i) => (chosen.includes(i) ? null : tile(i, () => onAnswer([...chosen, i]))))}
        </div>
      )}
      {checked && !checked.right && (
        <p className="text-sm">
          <span className="font-semibold text-ok">{t.rightOrder}</span> <span className="whitespace-pre-line">{checked.solution}</span>
        </p>
      )}
    </div>
  );
}

function OpenView({
  teacher,
  answer,
  mark,
  locked,
  onAnswer,
  onMark,
}: {
  teacher: boolean;
  answer: Answer;
  mark?: boolean;
  locked: boolean;
  onAnswer: (a: Answer) => void;
  onMark: (right: boolean) => void;
}) {
  const t = useT().quiz;
  const text = typeof answer === "string" ? answer : "";
  return (
    <div className="flex flex-col gap-2.5">
      <textarea
        value={text}
        rows={3}
        maxLength={2000}
        disabled={locked}
        placeholder={t.openPlaceholder}
        aria-label={t.openPlaceholder}
        onChange={(e) => onAnswer(e.target.value)}
        className="min-h-24 resize-y rounded-md border border-line bg-paper px-3 py-2 text-[16px] leading-relaxed text-ink focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      />
      {teacher && !locked && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-muted">{t.markOpen}</span>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={mark === v}
              onClick={() => onMark(v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border-[1.5px] px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                mark === v ? (v ? "border-ok bg-ok/10 text-ok" : "border-danger bg-danger-soft text-danger") : "border-line hover:bg-surface-2"
              }`}
            >
              {v ? <Check size={15} aria-hidden /> : <X size={15} aria-hidden />}
              {v ? t.markAsRight : t.markAsWrong}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
