"use client";

import { track } from "@vercel/analytics";
import { ArrowRight, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import type { RoomModel } from "@/components/room/roomModel";
import { buttonClass } from "@/components/ui/Button";
import { DEMO_IDS, DEMO_QUIZ, DEMO_STUDENT, LUCIA_LINES, LUCIA_TEXT, luciaAnswer } from "@/lib/demo/content";
import { useT } from "@/lib/i18n/client";
import type { PublicQuestion } from "@/lib/quiz";
import { setAnswer, setDone, useQuizState } from "@/lib/room/quizDoc";
import { useDemo } from "./DemoContext";

// Review A1: the demo lesson's pretend student and its short tour. Lucía "joins", reacts to
// what the teacher opens, writes in the text pad once she may, draws on the whiteboard, and
// answers the quiz (one answer wrong on purpose). Everything goes through the same Y.Docs a
// real student's edits arrive in, so the room behaves exactly as in a lesson.

const LUCIA = "demo-student"; // Yjs origin of her edits (not the editor's own)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STEPS = ["welcome", "worksheet", "write", "quiz", "check", "end"] as const;
type Step = (typeof STEPS)[number];

export default function DemoGuide({ model, isPhone }: { model: RoomModel; isPhone: boolean }) {
  const demo = useDemo();
  const t = useT().demo;
  const quiz = useQuizState(model.quizDoc, DEMO_QUIZ.id);
  const said = useRef(new Set<string>());
  const [wrote, setWrote] = useState(false);
  const [started, setStarted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const tabs = model.view.tabs;
  const canEdit = model.view.studentCanEdit;
  const say = demo?.say;

  // Once per thing: Lucía's line about it.
  const once = (key: string, run: () => void) => {
    if (said.current.has(key)) return;
    said.current.add(key);
    run();
  };

  // She arrives a moment after the room opens.
  useEffect(() => {
    track("demo_started");
    const timer = setTimeout(() => {
      demo?.arrive();
      demo?.say(LUCIA_LINES.hello, 5000);
    }, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactions to what the teacher shows.
  useEffect(() => {
    if (!demo?.here || !say) return;
    if (tabs.includes(`pdf:${DEMO_IDS.worksheet}`)) once("worksheet", () => say(LUCIA_LINES.worksheet));
    if (tabs.includes(`image:${DEMO_IDS.picture}`)) once("picture", () => say(LUCIA_LINES.picture));
    if (tabs.includes("draw")) once("board", () => say(canEdit ? LUCIA_LINES.boardDraw : LUCIA_LINES.boardAsk));
    if (model.view.justTalk) once("talk", () => say(LUCIA_LINES.justTalk));
    if (model.view.audio && model.view.audio.pausedAt === null) once("audio", () => say(LUCIA_LINES.audio));
  });

  // She may write: her sentences go into the text pad, letter by letter.
  useEffect(() => {
    if (!demo?.here || !canEdit || said.current.has("write")) return;
    said.current.add("write");
    say?.(LUCIA_LINES.write);
    void typeInto(model.doc, LUCIA_TEXT).then(() => setWrote(true));
  }, [demo?.here, canEdit, model.doc, say]);

  // Whiteboard open and she may draw: a little timeline.
  useEffect(() => {
    if (!demo?.here || !canEdit || !tabs.includes("draw") || said.current.has("drew")) return;
    said.current.add("drew");
    void wait(1500).then(() => drawTimeline(model.doc));
  }, [demo?.here, canEdit, tabs, model.doc]);

  // The quiz: once it's open she answers one question after another, then presses "I'm done".
  const quizOpen = tabs.includes(`quiz:${DEMO_QUIZ.id}`);
  const answering = useRef(false);
  const fresh = !quiz.done && !quiz.checked && Object.values(quiz.answers).every((a) => a === null || (Array.isArray(a) && a.every((x) => x === -1 || x === "")));
  useEffect(() => {
    if (!demo?.here || !quizOpen || !quiz.questions?.length || !fresh || answering.current) return;
    answering.current = true;
    const questions = quiz.questions;
    say?.(LUCIA_LINES.quiz);
    void (async () => {
      for (const q of questions) {
        await wait(2200);
        setAnswer(model.quizDoc, DEMO_QUIZ.id, q.id, luciaAnswer(q as PublicQuestion));
      }
      await wait(1200);
      setDone(model.quizDoc, DEMO_QUIZ.id, true);
      say?.(LUCIA_LINES.quizDone);
      answering.current = false;
    })();
  }, [demo?.here, quizOpen, quiz.questions, fresh, model.quizDoc, say]);
  useEffect(() => {
    if (quiz.checked) once(`checked-${Object.keys(quiz.checked).length}`, () => say?.(LUCIA_LINES.checked, 6000));
    else said.current.forEach((k) => k.startsWith("checked-") && said.current.delete(k)); // "Try again"
  });

  // The tour: the first step that isn't done yet.
  const done: Record<Step, boolean> = {
    welcome: started,
    worksheet: tabs.includes(`pdf:${DEMO_IDS.worksheet}`),
    write: wrote,
    quiz: quiz.done || !!quiz.checked,
    check: !!quiz.checked,
    end: false,
  };
  // Once done, a step stays done (the quiz may replace the worksheet, for example).
  const [reached, setReached] = useState<Step[]>([]);
  const newly = STEPS.filter((s) => done[s] && !reached.includes(s));
  if (newly.length) setReached([...reached, ...newly]); // React's way to follow a changing value
  const step = STEPS.find((s) => !done[s] && !reached.includes(s)) ?? "end";
  const index = STEPS.indexOf(step);
  useEffect(() => {
    if (step === "end") track("demo_tour_done");
  }, [step]);

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className={`fixed z-40 inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold shadow-soft hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          isPhone ? "right-3 bottom-[70px]" : "bottom-[66px] left-3"
        }`}
      >
        <Lightbulb size={16} aria-hidden className="text-accent" />
        {t.showTips}
      </button>
    );
  }

  const copy = t.steps[step];
  return (
    <section
      aria-label={t.tourLabel}
      data-testid="demo-tour"
      data-step={step}
      className={`fixed z-40 flex flex-col gap-2.5 rounded-panel border border-ink bg-surface p-4 shadow-[3px_3px_0_var(--color-marker)] ${
        isPhone ? "inset-x-2 bottom-[68px]" : "bottom-[66px] left-3 w-[360px]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink-muted">
          {step === "welcome" || step === "end" ? t.badge : t.stepOf(index, STEPS.length - 2)}
        </span>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label={t.hideTips}
          title={t.hideTips}
          className="-m-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <h2 className="text-[17px] leading-snug font-semibold">{copy.title(DEMO_STUDENT)}</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted">{copy.text(DEMO_STUDENT)}</p>
      {step === "welcome" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => setStarted(true)} className={buttonClass("primary", "md", "h-10 px-4 font-semibold")}>
            {t.startTour}
            <ArrowRight size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              setHidden(true);
            }}
            className={buttonClass("ghost", "md", "h-10 px-3 text-ink!")}
          >
            {t.explore}
          </button>
        </div>
      )}
      {(step === "worksheet" || step === "write" || step === "quiz") && model.actions && (
        <button
          type="button"
          onClick={() => {
            const a = model.actions!;
            if (step === "worksheet") a.open(`pdf:${DEMO_IDS.worksheet}`);
            if (step === "write") a.setStudentCanEdit(true);
            if (step === "quiz") {
              const pdf = tabs.indexOf(`pdf:${DEMO_IDS.worksheet}`);
              a.openAt(`quiz:${DEMO_QUIZ.id}`, tabs.length > 1 ? (pdf >= 0 ? pdf : tabs.length - 1) : "auto");
            }
          }}
          className="self-start text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          {t.doItForMe}
        </button>
      )}
      {step === "end" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/signup"
            onClick={() => track("demo_signup_click")}
            className={buttonClass("primary", "md", "h-10 px-4 font-semibold")}
          >
            {t.createClassroom}
            <ArrowRight size={16} aria-hidden />
          </Link>
          <button type="button" onClick={() => setHidden(true)} className={buttonClass("ghost", "md", "h-10 px-3 text-ink!")}>
            {t.keepExploring}
          </button>
        </div>
      )}
    </section>
  );
}

// Lucía types: a new paragraph per line, a letter at a time (like a real student's edits).
async function typeInto(doc: Y.Doc, lines: string[]) {
  const fragment = doc.getXmlFragment("default"); // Tiptap Collaboration's field
  for (const line of lines) {
    const text = new Y.XmlText();
    const paragraph = new Y.XmlElement("paragraph");
    doc.transact(() => {
      paragraph.insert(0, [text]);
      fragment.push([paragraph]);
    }, LUCIA);
    for (const ch of line) {
      await wait(45 + Math.random() * 60);
      doc.transact(() => text.insert(text.length, ch), LUCIA);
    }
    await wait(500);
  }
}

// "yesterday ← now" with the verb she learned, on the whiteboard.
async function drawTimeline(doc: Y.Doc) {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const stroke = "#1d6fd1";
  const elements = convertToExcalidrawElements([
    { type: "arrow", x: 120, y: 160, width: 420, height: 0, strokeColor: stroke, strokeWidth: 2, startArrowhead: "arrow", endArrowhead: null },
    { type: "text", x: 90, y: 180, text: "yesterday", fontSize: 24, strokeColor: stroke },
    { type: "text", x: 520, y: 180, text: "now", fontSize: 24, strokeColor: stroke },
    { type: "ellipse", x: 230, y: 70, width: 150, height: 70, strokeColor: "#d9534f", strokeWidth: 2 },
    { type: "text", x: 262, y: 90, text: "I went", fontSize: 24, strokeColor: "#d9534f" },
  ]);
  const board = doc.getMap<unknown>("board");
  doc.transact(() => {
    elements.forEach((e, i) => board.set(e.id, { ...e, index: `a${String.fromCharCode(48 + i)}` }));
  }, LUCIA);
}
