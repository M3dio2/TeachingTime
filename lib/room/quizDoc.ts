"use client";

import { useEffect, useState } from "react";
import type * as Y from "yjs";
import {
  type Answer,
  type Checked,
  cleanAnswer,
  type PublicQuestion,
  publicQuestions,
  type Quiz,
} from "@/lib/quiz";
import type { TabId } from "./tabs";

// Q1: a quiz in a lesson lives in its own Y.Doc ("quiz", synced like the lesson doc but open
// to the student: answering never needs "student can edit"). One root map per quiz:
//   title, questions (JSON of PublicQuestion[], no answers), a:<question id> (JSON answer),
//   done (the student pressed "I'm done"), m:<question id> (the teacher's mark on an open
//   answer, true/false), checked (JSON of Record<question id, Checked>).
// The teacher writes title, questions and checked; both write answers. Nothing here is saved:
// the result is (quiz_results, written by the teacher's client).

const map = (doc: Y.Doc, quizId: string) => doc.getMap<unknown>(`quiz:${quizId}`);
const json = <T,>(raw: unknown, fallback: T): T => {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

// Teacher: put the quiz (without its answers) into the doc. Again after an edit in the
// dashboard: the questions are compared, so an unchanged quiz writes nothing.
export function publishQuiz(doc: Y.Doc, quiz: Quiz) {
  const m = map(doc, quiz.id);
  const questions = JSON.stringify(publicQuestions(quiz.questions));
  doc.transact(() => {
    if (m.get("title") !== quiz.title) m.set("title", quiz.title);
    if (m.get("questions") !== questions) m.set("questions", questions);
  });
}

export type QuizState = {
  title: string;
  questions: PublicQuestion[] | null; // null until the teacher's client has published it
  answers: Record<string, Answer>;
  done: boolean;
  marks: Record<string, boolean>; // open answers the teacher marked
  checked: Record<string, Checked> | null;
};

function read(doc: Y.Doc, quizId: string): QuizState {
  const m = map(doc, quizId);
  const questions = json<PublicQuestion[] | null>(m.get("questions"), null);
  const answers: Record<string, Answer> = {};
  const marks: Record<string, boolean> = {};
  for (const q of questions ?? []) {
    answers[q.id] = cleanAnswer(q, json(m.get(`a:${q.id}`), null));
    const mark = m.get(`m:${q.id}`);
    if (typeof mark === "boolean") marks[q.id] = mark;
  }
  return {
    title: typeof m.get("title") === "string" ? (m.get("title") as string) : "",
    questions: Array.isArray(questions) ? questions : null,
    answers,
    done: m.get("done") === true,
    marks,
    checked: json<Record<string, Checked> | null>(m.get("checked"), null),
  };
}

export function useQuizState(doc: Y.Doc, quizId: string): QuizState {
  const [state, setState] = useState(() => read(doc, quizId));
  useEffect(() => {
    const m = map(doc, quizId);
    const update = () => setState(read(doc, quizId));
    update();
    m.observe(update);
    return () => m.unobserve(update);
  }, [doc, quizId]);
  return state;
}

export const setAnswer = (doc: Y.Doc, quizId: string, questionId: string, answer: Answer) =>
  map(doc, quizId).set(`a:${questionId}`, JSON.stringify(answer));

export const setMark = (doc: Y.Doc, quizId: string, questionId: string, right: boolean) =>
  map(doc, quizId).set(`m:${questionId}`, right);

export const setDone = (doc: Y.Doc, quizId: string, done: boolean) => map(doc, quizId).set("done", done);

export const setChecked = (doc: Y.Doc, quizId: string, checked: Record<string, Checked>) =>
  map(doc, quizId).set("checked", JSON.stringify(checked));

// "Try again": answers, done and the check go; the quiz stays.
export function resetQuiz(doc: Y.Doc, quizId: string) {
  const m = map(doc, quizId);
  doc.transact(() => {
    for (const key of [...m.keys()]) if (key.startsWith("a:") || key.startsWith("m:") || key === "done" || key === "checked") m.delete(key);
  });
}

// The student's tab labels for quiz tabs (she has no access to the quizzes table).
export function useQuizNames(doc: Y.Doc, tabs: TabId[]) {
  const ids = tabs.filter((t) => t.startsWith("quiz:")).map((t) => t.slice(5));
  const key = ids.join(",");
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const quizIds = key ? key.split(",") : [];
    const update = () => {
      const next: Record<string, string> = {};
      for (const id of quizIds) {
        const title = map(doc, id).get("title");
        if (typeof title === "string" && title) next[`quiz:${id}`] = title;
      }
      setNames(next);
    };
    update();
    const maps = quizIds.map((id) => map(doc, id));
    maps.forEach((m) => m.observe(update));
    return () => maps.forEach((m) => m.unobserve(update));
  }, [doc, key]);
  return names;
}
