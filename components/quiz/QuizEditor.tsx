"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  Copy,
  Ellipsis,
  GripVertical,
  Plus,
  School,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { deleteQuiz, discardIfEmpty, duplicateQuiz, saveQuiz, setQuizClassroom } from "@/app/(app)/dashboard/quiz/actions";
import { inputClass } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Sheet from "@/components/ui/Sheet";
import SubmitButton from "@/components/ui/SubmitButton";
import { useT } from "@/lib/i18n/client";
import {
  emptyQuestion,
  MAX_GAP_TEXT,
  MAX_NOTE,
  MAX_OPTION,
  MAX_OPTIONS,
  MAX_PAIRS,
  MAX_PROMPT,
  MAX_QUESTIONS,
  MAX_TITLE,
  MIN_OPTIONS,
  MIN_PAIRS,
  parseGaps,
  type Question,
  questionProblem,
  QUESTION_TYPES,
  type QuestionType,
  type Quiz,
  playable,
} from "@/lib/quiz";
import { TYPE_ICONS } from "./QuestionTypes";

const SAVE_AFTER_MS = 700;
type SaveState = "saved" | "saving" | "failed";
// What is being dragged: a new block from the right, or a question of the quiz.
type Dragging = { block: QuestionType } | { move: string } | null;

// Q1: the quiz editor (docs/mockups/quiz/, v2). The questions on the left as blocks; the
// blocks of every question type on the right, to drag into the quiz (or click). A question
// opens when clicked: its fields, then its options right beneath; the ones below move down.
// Every change is saved a moment later. Phones: no block column; "+ Add a question" opens
// the blocks in a sheet.
// Editors open per quiz, so leaving one only discards an empty quiz nobody is editing.
const openEditors = new Map<string, number>();

export default function QuizEditor({
  quiz,
  classrooms,
  inClassrooms,
}: {
  quiz: Quiz;
  classrooms: { id: string; name: string }[];
  inClassrooms: string[];
}) {
  const t = useT().quiz;
  const [title, setTitle] = useState(quiz.title);
  const [questions, setQuestions] = useState<Question[]>(quiz.questions);
  const [selected, setSelected] = useState<string | null>(quiz.questions[0]?.id ?? null);
  const [state, setState] = useState<SaveState>("saved");
  const [version, setVersion] = useState(0);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
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
      if (latest.current.title === title && latest.current.questions === questions) setState(ok ? "saved" : "failed");
    }, SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [version, quiz.id]);

  // Leaving with no finished question: the quiz isn't kept (a closed tab: the dashboard
  // tidies it up later).
  useEffect(() => {
    const id = quiz.id;
    openEditors.set(id, (openEditors.get(id) ?? 0) + 1);
    return () => {
      openEditors.set(id, (openEditors.get(id) ?? 1) - 1);
      // Later, and only if it wasn't opened again (React's dev double mount, a fast return).
      setTimeout(() => {
        if (!openEditors.get(id) && !playable(latest.current.questions).length) void discardIfEmpty(id);
      }, 1000);
    };
  }, [quiz.id]);

  useEffect(() => {
    if (state === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  const full = questions.length >= MAX_QUESTIONS;
  const incomplete = questions.filter((q) => questionProblem(q) !== null).length;
  const insert = (type: QuestionType, at: number) => {
    if (full) return;
    const q = emptyQuestion(type);
    edit({ questions: [...questions.slice(0, at), q, ...questions.slice(at)] });
    setSelected(q.id);
  };
  // A click on a block: below the open question, else at the end.
  const add = (type: QuestionType) => {
    const at = questions.findIndex((q) => q.id === selected);
    insert(type, at === -1 ? questions.length : at + 1);
  };
  const moveTo = (id: string, at: number) => {
    const from = questions.findIndex((q) => q.id === id);
    if (from === -1) return;
    const next = [...questions];
    const [q] = next.splice(from, 1);
    next.splice(at > from ? at - 1 : at, 0, q);
    edit({ questions: next });
  };
  const setQuestion = (q: Question) => edit({ questions: questions.map((old) => (old.id === q.id ? q : old)) });
  const remove = (id: string) => {
    const i = questions.findIndex((q) => q.id === id);
    edit({ questions: questions.filter((q) => q.id !== id) });
    setSelected(questions[i + 1]?.id ?? questions[i - 1]?.id ?? null);
  };
  const duplicate = (q: Question) => {
    const copy = { ...structuredClone(q), id: crypto.randomUUID() };
    const i = questions.findIndex((x) => x.id === q.id);
    edit({ questions: [...questions.slice(0, i + 1), copy, ...questions.slice(i + 1)] });
    setSelected(copy.id);
  };

  const endDrag = () => {
    setDragging(null);
    setDropAt(null);
  };
  const onDrop = () => {
    if (dragging && dropAt !== null) {
      if ("block" in dragging) insert(dragging.block, dropAt);
      else moveTo(dragging.move, dropAt);
    }
    endDrag();
  };
  // Over a question: before it in its upper half, after it in its lower half.
  const overCard = (e: React.DragEvent, i: number) => {
    if (!dragging) return;
    e.preventDefault();
    const box = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientY < box.top + box.height / 2 ? i : i + 1);
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="quiz-title" className="text-sm font-medium text-ink-muted">
              {t.titleLabel}
            </label>
            <input
              id="quiz-title"
              value={title}
              maxLength={MAX_TITLE}
              placeholder={t.titlePlaceholder}
              onChange={(e) => edit({ title: e.target.value })}
              className="-mx-2 w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em] text-ink placeholder:text-ink-muted/60 hover:border-line focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none md:text-4xl"
            />
            <SaveStatus state={state} />
            {incomplete > 0 && (
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-warn" data-testid="quiz-incomplete">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-warn" />
                {t.incompleteNote(incomplete)}
              </p>
            )}
          </div>
          <QuizMenu id={quiz.id} title={title} />
        </div>
        <ClassroomPicker quizId={quiz.id} classrooms={classrooms} initial={inClassrooms} />

        <ol
          className="flex flex-col"
          onDragOver={(e) => dragging && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onDrop();
          }}
        >
          {questions.map((q, i) => (
            <li
              key={q.id}
              className="flex flex-col"
              onDragOver={(e) => overCard(e, i)}
              aria-label={t.question(i + 1)}
            >
              {dropAt === i && <DropLine />}
              <QuestionCard
                n={i + 1}
                q={q}
                open={selected === q.id}
                moving={dragging !== null && "move" in dragging && dragging.move === q.id}
                onOpen={() => setSelected(q.id)}
                onChange={setQuestion}
                onMoveUp={i > 0 ? () => moveTo(q.id, i - 1) : undefined}
                onMoveDown={i < questions.length - 1 ? () => moveTo(q.id, i + 2) : undefined}
                onDuplicate={full ? undefined : () => duplicate(q)}
                onRemove={() => remove(q.id)}
                onDragStart={() => setDragging({ move: q.id })}
                onDragEnd={endDrag}
              />
            </li>
          ))}
          <li
            className="flex flex-col"
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              setDropAt(questions.length);
            }}
          >
            {dropAt === questions.length && questions.length > 0 && <DropLine />}
            {questions.length === 0 ? (
              <p
                className={`flex min-h-32 items-center justify-center rounded-panel border-[1.5px] border-dashed p-6 text-center text-sm ${
                  dragging ? "border-accent bg-marker-soft/50 text-ink" : "border-line text-ink-muted"
                }`}
              >
                {t.emptyQuiz}
              </p>
            ) : (
              // Room to drop below the last question.
              <span className={dragging ? "h-16" : "h-2"} />
            )}
          </li>
        </ol>
        {full && <p className="text-sm text-ink-muted">{t.maxQuestions(MAX_QUESTIONS)}</p>}
      </div>

      {/* Desktop: the blocks, always in reach while scrolling. */}
      <aside
        aria-label={t.blocks}
        className="hidden min-w-0 flex-[0_0_280px] flex-col gap-3 rounded-panel border border-line bg-surface p-4 md:sticky md:top-6 md:flex"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold">{t.blocks}</h2>
          <p className="text-[13px] leading-snug text-ink-muted">{t.blocksHint}</p>
        </div>
        <Blocks
          disabled={full}
          onAdd={add}
          onDragStart={(type) => setDragging({ block: type })}
          onDragEnd={endDrag}
        />
      </aside>

      {/* Phones: one button at the bottom, the blocks in a sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <button
          type="button"
          disabled={full}
          onClick={() => setSheet(true)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent font-semibold text-white disabled:opacity-60"
        >
          <Plus size={18} aria-hidden />
          {t.addQuestion}
        </button>
      </div>
      {sheet && (
        <Sheet title={t.addQuestion} onClose={() => setSheet(false)}>
          <Blocks
            disabled={full}
            onAdd={(type) => {
              add(type);
              setSheet(false);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}

function DropLine() {
  const t = useT().quiz;
  return (
    <div className="flex h-14 items-center justify-center rounded-panel border-[1.5px] border-dashed border-accent bg-marker-soft/50 text-[13px] font-semibold text-marker-ink">
      {t.dropHere}
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

// ⋯ next to the title: duplicate or delete the whole quiz.
function QuizMenu({ id, title }: { id: string; title: string }) {
  const t = useT().quiz;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // Not while our confirm dialog is up (its form would be gone before it submits).
    const down = (e: PointerEvent) =>
      !wrap.current?.contains(e.target as Node) && !(e.target as Element).closest?.("[role=alertdialog]") && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  const item =
    "flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";
  return (
    <div ref={wrap} className="relative mt-6">
      <button
        type="button"
        aria-label={t.quizMenu}
        title={t.quizMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Ellipsis size={18} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-1.5 w-52 rounded-panel border border-line bg-surface p-1.5 shadow-soft">
          <form action={duplicateQuiz}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="ghost" role="menuitem" className={`${item} justify-start text-ink!`} pending={t.creating}>
              <Copy size={16} aria-hidden />
              {t.duplicate}
            </SubmitButton>
          </form>
          <form action={deleteQuiz}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="then" value="dashboard" />
            <SubmitButton
              variant="ghost"
              role="menuitem"
              className={`${item} justify-start text-danger!`}
              pending={t.deleting}
              confirm={t.deleteConfirm(title || t.untitled)}
              confirmLabel={tc.delete}
            >
              <Trash2 size={16} aria-hidden />
              {t.deleteQuiz}
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

function Blocks({
  disabled,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  disabled: boolean;
  onAdd: (type: QuestionType) => void;
  onDragStart?: (type: QuestionType) => void;
  onDragEnd?: () => void;
}) {
  const t = useT().quiz;
  return (
    <ul className="flex flex-col gap-1.5">
      {QUESTION_TYPES.map((type) => {
        const Icon = TYPE_ICONS[type];
        return (
          <li key={type}>
            <button
              type="button"
              disabled={disabled}
              draggable={Boolean(onDragStart) && !disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", t.types[type].name);
                e.dataTransfer.effectAllowed = "copy";
                // After the browser has taken its drag picture (changing the page during
                // dragstart can cancel the drag in Chrome).
                setTimeout(() => onDragStart?.(type), 0);
              }}
              onDragEnd={() => setTimeout(() => onDragEnd?.(), 0)}
              onClick={() => onAdd(type)}
              className="flex w-full cursor-grab items-center gap-3 rounded-md border border-line bg-surface p-2.5 text-left hover:border-accent hover:bg-paper focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                <Icon size={18} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">{t.types[type].name}</span>
                <span className="text-[12px] leading-snug text-ink-muted">{t.types[type].text}</span>
              </span>
              <GripVertical size={16} aria-hidden className="hidden shrink-0 text-ink-muted md:block" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const iconButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-30 disabled:hover:bg-transparent";

// A short line for a closed question.
function summary(q: Question) {
  if (q.prompt.trim()) return q.prompt;
  if (q.type === "gap" || q.type === "select" || q.type === "order") return q.text.replace(/\s+/g, " ");
  if (q.type === "match") return q.pairs.map((p) => p.left).filter(Boolean).join(" · ");
  return "";
}

function QuestionCard({
  n,
  q,
  open,
  moving,
  onOpen,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  n: number;
  q: Question;
  open: boolean;
  moving: boolean;
  onOpen: () => void;
  onChange: (q: Question) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const t = useT().quiz;
  const problem = questionProblem(q);
  const Icon = TYPE_ICONS[q.type];
  const head = (
    <>
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", t.question(n));
          e.dataTransfer.effectAllowed = "move";
          setTimeout(onDragStart, 0);
        }}
        onDragEnd={() => setTimeout(onDragEnd, 0)}
        title={t.dragToMove}
        aria-hidden
        className="hidden h-9 w-6 shrink-0 cursor-grab items-center justify-center text-ink-muted md:inline-flex"
      >
        <GripVertical size={16} />
      </span>
      <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-marker-soft px-2 font-display text-sm font-extrabold text-marker-ink">
        {n}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-muted">
        <Icon size={14} aria-hidden className="text-accent" />
        {t.types[q.type].name}
      </span>
    </>
  );

  if (!open) {
    return (
      <div
        className={`mb-3 flex items-center gap-2.5 rounded-panel border border-line bg-surface py-2.5 pr-3 pl-2 md:pl-1 ${moving ? "opacity-40" : ""}`}
      >
        {head}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${t.edit}: ${t.question(n)}`}
          className="min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left text-[15px] font-medium hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {summary(q) || <span className="text-ink-muted">…</span>}
        </button>
        {problem && <span title={t.problems[problem]} className="h-2.5 w-2.5 shrink-0 rounded-full bg-warn" />}
      </div>
    );
  }

  return (
    <div
      data-open
      className={`mb-3 flex flex-col gap-4 rounded-panel border border-accent bg-surface p-4 shadow-[0_0_0_3px_rgb(139_94_60/0.12)] md:p-5 ${moving ? "opacity-40" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2.5 md:-ml-2">
        {head}
        <span className="flex-1" />
        <div className="flex items-center">
          <button type="button" className={iconButton} aria-label={t.moveUp} title={t.moveUp} disabled={!onMoveUp} onClick={onMoveUp}>
            <ArrowUp size={16} aria-hidden />
          </button>
          <button type="button" className={iconButton} aria-label={t.moveDown} title={t.moveDown} disabled={!onMoveDown} onClick={onMoveDown}>
            <ArrowDown size={16} aria-hidden />
          </button>
          <button type="button" className={iconButton} aria-label={t.duplicateQuestion} title={t.duplicateQuestion} disabled={!onDuplicate} onClick={onDuplicate}>
            <Copy size={16} aria-hidden />
          </button>
          <button type="button" className={`${iconButton} hover:text-danger!`} aria-label={t.removeQuestion} title={t.removeQuestion} onClick={onRemove}>
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>

      <Fields q={q} onChange={onChange} />

      {/* The question's options, right beneath it. */}
      <section aria-label={t.options} className="flex flex-col gap-3 rounded-md bg-paper p-3.5">
        <span className="text-[13px] font-semibold text-ink-muted">{t.options}</span>
        {q.type === "choice" && (
          <Toggle label={t.mixAnswers} on={q.shuffle} onChange={(shuffle) => onChange({ ...q, shuffle })} />
        )}
        <TextField label={t.hintLabel} value={q.hint} max={MAX_NOTE} placeholder={t.hintPlaceholder} onChange={(hint) => onChange({ ...q, hint })} />
        <TextField
          label={t.explanationLabel}
          value={q.explanation}
          max={MAX_NOTE}
          placeholder={t.explanationPlaceholder}
          onChange={(explanation) => onChange({ ...q, explanation })}
        />
      </section>

      {problem && (
        <p className="flex items-start gap-1.5 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn">
          <CircleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            {t.problems[problem]} {t.notInLesson}
          </span>
        </p>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  max,
  placeholder,
  onChange,
  rows,
  hint,
}: {
  label: string;
  value: string;
  max: number;
  placeholder?: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {rows ? (
        <textarea
          value={value}
          maxLength={max}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass()} h-auto resize-y py-2 leading-relaxed`}
        />
      ) : (
        <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass()} />
      )}
      {hint && <span className="text-[13px] font-normal text-ink-muted">{hint}</span>}
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center gap-2.5 self-start rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-ok" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

function Fields({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  const t = useT().quiz;
  const prompt = (label: string, placeholder: string) => (
    <TextField label={label} value={q.prompt} max={MAX_PROMPT} placeholder={placeholder} onChange={(prompt) => onChange({ ...q, prompt })} />
  );
  switch (q.type) {
    case "choice": {
      const toggle = (i: number) => {
        const has = q.correct.includes(i);
        const correct = has ? q.correct.filter((c) => c !== i) : [...q.correct, i];
        if (correct.length) onChange({ ...q, correct });
      };
      const removeOption = (i: number) => {
        const correct = q.correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c));
        onChange({ ...q, options: q.options.filter((_, j) => j !== i), correct: correct.length ? correct : [0] });
      };
      return (
        <>
          {prompt(t.promptLabel, t.promptPlaceholder)}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">
              {t.answersLabel} <span className="font-normal text-ink-muted">· {t.answersHint}</span>
            </legend>
            {q.options.map((o, i) => {
              const right = q.correct.includes(i);
              return (
                <Row key={i} right={right}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={right}
                    aria-label={t.markRight(i + 1)}
                    title={t.markRight(i + 1)}
                    onClick={() => toggle(i)}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      right ? "border-ok bg-ok text-white" : "border-line text-transparent hover:border-ok"
                    }`}
                  >
                    <Check size={14} strokeWidth={3} aria-hidden />
                  </button>
                  <RowInput value={o} max={MAX_OPTION} label={t.answerPlaceholder(i + 1)} onChange={(v) => onChange({ ...q, options: q.options.map((x, j) => (j === i ? v : x)) })} />
                  {q.options.length > MIN_OPTIONS && (
                    <button type="button" className={iconButton} aria-label={t.removeAnswer(i + 1)} title={t.removeAnswer(i + 1)} onClick={() => removeOption(i)}>
                      <X size={16} aria-hidden />
                    </button>
                  )}
                </Row>
              );
            })}
            {q.options.length < MAX_OPTIONS && <AddRow label={t.addAnswer} onClick={() => onChange({ ...q, options: [...q.options, ""] })} />}
          </fieldset>
        </>
      );
    }
    case "truefalse":
      return (
        <>
          {prompt(t.statementLabel, t.statementPlaceholder)}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{t.rightAnswerIs}</span>
            <div className="w-56">
              <Segmented
                label={t.rightAnswerIs}
                value={q.answer ? "true" : "false"}
                onChange={(v) => onChange({ ...q, answer: v === "true" })}
                segments={[
                  { id: "true", label: t.isTrue },
                  { id: "false", label: t.isFalse },
                ]}
              />
            </div>
          </div>
        </>
      );
    case "gap":
    case "select":
      return (
        <>
          {prompt(t.instructionLabel, t.instructionPlaceholder)}
          <TextField
            label={t.gapTextLabel}
            value={q.text}
            max={MAX_GAP_TEXT}
            rows={3}
            placeholder={q.type === "gap" ? t.gapTextPlaceholder : t.selectTextPlaceholder}
            hint={q.type === "gap" ? t.gapHint : t.selectHint}
            onChange={(text) => onChange({ ...q, text })}
          />
          <GapPreview text={q.text} select={q.type === "select"} />
        </>
      );
    case "match":
      return (
        <>
          {prompt(t.instructionLabel, t.instructionPlaceholder)}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">
              {t.pairsLabel} <span className="font-normal text-ink-muted">· {t.pairsHint}</span>
            </legend>
            {q.pairs.map((p, i) => {
              const set = (side: "left" | "right", v: string) =>
                onChange({ ...q, pairs: q.pairs.map((x, j) => (j === i ? { ...x, [side]: v } : x)) });
              return (
                <Row key={i}>
                  <RowInput value={p.left} max={MAX_OPTION} label={t.leftPlaceholder(i + 1)} onChange={(v) => set("left", v)} />
                  <span aria-hidden className="shrink-0 text-ink-muted">↔</span>
                  <RowInput value={p.right} max={MAX_OPTION} label={t.rightPlaceholder(i + 1)} onChange={(v) => set("right", v)} />
                  {q.pairs.length > MIN_PAIRS && (
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={t.removePair(i + 1)}
                      title={t.removePair(i + 1)}
                      onClick={() => onChange({ ...q, pairs: q.pairs.filter((_, j) => j !== i) })}
                    >
                      <X size={16} aria-hidden />
                    </button>
                  )}
                </Row>
              );
            })}
            {q.pairs.length < MAX_PAIRS && (
              <AddRow label={t.addPair} onClick={() => onChange({ ...q, pairs: [...q.pairs, { left: "", right: "" }] })} />
            )}
          </fieldset>
        </>
      );
    case "order":
      return (
        <>
          {prompt(t.instructionLabel, t.instructionPlaceholder)}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{t.orderMode}</span>
            <div className="w-72 max-w-full">
              <Segmented
                label={t.orderMode}
                value={q.mode}
                onChange={(v) => onChange({ ...q, mode: v === "list" ? "list" : "sentence" })}
                segments={[
                  { id: "sentence", label: t.orderSentence },
                  { id: "list", label: t.orderList },
                ]}
              />
            </div>
          </div>
          <TextField
            label={q.mode === "list" ? t.orderListLabel : t.orderSentenceLabel}
            value={q.text}
            max={MAX_GAP_TEXT}
            rows={q.mode === "list" ? 4 : 2}
            placeholder={q.mode === "list" ? t.orderListPlaceholder : t.orderSentencePlaceholder}
            hint={t.orderHint}
            onChange={(text) => onChange({ ...q, text })}
          />
        </>
      );
    case "open":
      return (
        <>
          {prompt(t.promptLabel, t.promptPlaceholder)}
          <TextField
            label={t.sampleLabel}
            value={q.sample}
            max={MAX_NOTE}
            rows={2}
            placeholder={t.samplePlaceholder}
            hint={t.openHint}
            onChange={(sample) => onChange({ ...q, sample })}
          />
        </>
      );
  }
}

function Row({ right, children }: { right?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 rounded-md border p-1.5 pl-2 ${right ? "border-ok bg-ok/5" : "border-line"}`}>{children}</div>
  );
}

function RowInput({ value, max, label, onChange }: { value: string; max: number; label: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      maxLength={max}
      placeholder={label}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 min-w-0 flex-1 rounded-md border-0 bg-transparent px-1.5 text-base text-ink placeholder:text-ink-muted focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
    />
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 self-start rounded-md px-2 text-sm font-semibold text-accent hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Plus size={16} aria-hidden />
      {label}
    </button>
  );
}

function GapPreview({ text, select }: { text: string; select: boolean }) {
  const t = useT().quiz;
  const parts = parseGaps(text);
  if (!parts.some(Array.isArray)) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line p-3">
      <span className="text-[13px] font-medium text-ink-muted">{t.preview}</span>
      <p className="leading-[2.1]">
        {parts.map((p, i) =>
          Array.isArray(p) ? (
            <span key={i} className="mx-0.5 inline-flex min-w-16 items-center justify-center gap-1 rounded border-b-2 border-accent bg-paper px-2 text-ink-muted">
              {select ? `${t.choose} ▾` : "\u00a0"}
            </span>
          ) : (
            <span key={i} className="whitespace-pre-wrap">
              {p}
            </span>
          ),
        )}
      </p>
    </div>
  );
}

// Q1b: which Classrooms the quiz is in (only those lessons list it). A pill per Classroom,
// on or off; each tap is saved right away (and undone if saving fails).
function ClassroomPicker({
  quizId,
  classrooms,
  initial,
}: {
  quizId: string;
  classrooms: { id: string; name: string }[];
  initial: string[];
}) {
  const t = useT().quiz;
  const [on, setOn] = useState(() => new Set(initial));
  const [failed, setFailed] = useState(false);
  const toggle = async (id: string) => {
    const next = !on.has(id);
    const flip = (value: boolean) =>
      setOn((old) => {
        const copy = new Set(old);
        if (value) copy.add(id);
        else copy.delete(id);
        return copy;
      });
    flip(next);
    setFailed(false);
    const ok = await setQuizClassroom(quizId, id, next).catch(() => false);
    if (!ok) {
      flip(!next);
      setFailed(true);
    }
  };
  return (
    <section
      aria-labelledby="quiz-classrooms"
      className={`flex flex-col gap-2.5 rounded-panel border p-4 ${on.size ? "border-line bg-surface" : "border-marker/60 bg-marker-soft/40"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="quiz-classrooms"
          className="flex items-center gap-2 text-[15px] font-semibold"
        >
          <School size={16} aria-hidden className="text-accent" />
          {t.inClassrooms}
        </h2>
        <span className="text-[13px] text-ink-muted">
          {on.size ? t.inClassroomsHint : t.notInClassroom}
        </span>
      </div>
      {classrooms.length ? (
        <ul className="flex flex-wrap gap-2">
          {classrooms.map((c) => {
            const active = on.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(c.id)}
                  className={`inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-ink hover:border-accent"
                  }`}
                >
                  {active ? (
                    <Check size={15} aria-hidden />
                  ) : (
                    <Plus size={15} aria-hidden className="text-ink-muted" />
                  )}
                  <span className="truncate">{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{t.noClassroomsYet}</p>
      )}
      {failed && (
        <p role="alert" className="text-[13px] text-danger">
          {t.classroomNotSaved}
        </p>
      )}
    </section>
  );
}
