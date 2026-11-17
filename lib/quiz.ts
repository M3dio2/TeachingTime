// Q1: quizzes. Shared by the dashboard editor, the server actions and the lesson room.
// Two kinds of question:
// - "choice": a question with 2–8 answers, one of them right.
// - "gap": a text with gaps in [brackets]; several right answers with a slash: [went/walked].
// The full quiz (with the answers) only ever reaches the teacher's browser. The student gets
// `publicQuestions` (no answers); the teacher's client checks and publishes the result.

export const MAX_QUIZZES = 100; // per teacher (also in 0014_quizzes.sql)
export const MAX_QUESTIONS = 50;
export const MAX_TITLE = 80;
export const MAX_PROMPT = 300;
export const MAX_OPTION = 200;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
export const MAX_GAP_TEXT = 1000;
export const MAX_GAPS = 20;

export type ChoiceQuestion = { id: string; type: "choice"; prompt: string; options: string[]; correct: number };
export type GapQuestion = { id: string; type: "gap"; prompt: string; text: string };
export type Question = ChoiceQuestion | GapQuestion;
export type Quiz = { id: string; title: string; questions: Question[] };

// What the student sees: no answers. In a gap text, `null` marks a gap.
export type PublicQuestion =
  | { id: string; type: "choice"; prompt: string; options: string[] }
  | { id: string; type: "gap"; prompt: string; parts: (string | null)[] };

// An answer: the chosen option's index, or one text per gap.
export type Answer = number | string[] | null;

// The teacher's check of one question: right/wrong (per gap for gap texts), and the solution.
export type Checked =
  | { type: "choice"; right: boolean; solution: number }
  | { type: "gap"; right: boolean[]; solution: string[] };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const newId = () => crypto.randomUUID();

export const emptyChoice = (): ChoiceQuestion => ({ id: newId(), type: "choice", prompt: "", options: ["", ""], correct: 0 });
export const emptyGap = (): GapQuestion => ({ id: newId(), type: "gap", prompt: "", text: "" });

// Anything from the browser or the database, made safe. Incomplete questions are kept (the
// editor saves drafts); `isPlayable` decides what a lesson shows.
export function cleanQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  const out: Question[] = [];
  for (const q of raw.slice(0, MAX_QUESTIONS)) {
    if (!q || typeof q !== "object") continue;
    const r = q as Record<string, unknown>;
    const id = typeof r.id === "string" && /^[0-9a-f-]{36}$/.test(r.id) ? r.id : newId();
    if (r.type === "choice") {
      const options = (Array.isArray(r.options) ? r.options : []).slice(0, MAX_OPTIONS).map((o) => str(o, MAX_OPTION));
      while (options.length < MIN_OPTIONS) options.push("");
      const n = Number(r.correct);
      const correct = Number.isInteger(n) && n >= 0 && n < options.length ? n : 0;
      out.push({ id, type: "choice", prompt: str(r.prompt, MAX_PROMPT), options, correct });
    } else if (r.type === "gap") {
      out.push({ id, type: "gap", prompt: str(r.prompt, MAX_PROMPT), text: str(r.text, MAX_GAP_TEXT) });
    }
  }
  return out;
}

export const cleanTitle = (raw: unknown) => str(raw, MAX_TITLE).trim();

// "I [go/went] home." → ["I ", ["go", "went"], " home."]
export function parseGaps(text: string): (string | string[])[] {
  const parts: (string | string[])[] = [];
  const re = /\[([^[\]]*)\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const answers = m[1].split("/").map((a) => a.trim()).filter(Boolean);
    parts.push(answers.length ? answers : [""]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export const gapAnswers = (q: GapQuestion) => parseGaps(q.text).filter((p): p is string[] => Array.isArray(p));

// What's missing before a question can be used in a lesson (null: ready).
export type Problem = "noPrompt" | "emptyOption" | "noGap" | "emptyGap" | "tooManyGaps";
export function questionProblem(q: Question): Problem | null {
  if (q.type === "choice") {
    if (!q.prompt.trim()) return "noPrompt";
    if (q.options.some((o) => !o.trim())) return "emptyOption";
    return null;
  }
  const gaps = gapAnswers(q);
  if (!gaps.length) return "noGap";
  if (gaps.length > MAX_GAPS) return "tooManyGaps";
  if (gaps.some((g) => !g[0])) return "emptyGap";
  return null;
}
export const isPlayable = (q: Question) => questionProblem(q) === null;
export const playable = (questions: Question[]) => questions.filter(isPlayable);

export function publicQuestions(questions: Question[]): PublicQuestion[] {
  return playable(questions).map((q) =>
    q.type === "choice"
      ? { id: q.id, type: "choice", prompt: q.prompt, options: q.options }
      : { id: q.id, type: "gap", prompt: q.prompt, parts: parseGaps(q.text).map((p) => (Array.isArray(p) ? null : p)) },
  );
}

// Lenient on case, spaces, curly apostrophes and a full stop at the end; strict on accents
// (in a language lesson "été" and "ete" are different answers).
export const normalize = (s: string) =>
  s.normalize("NFC").replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "").toLowerCase();

export function checkQuestion(q: Question, answer: Answer): Checked {
  if (q.type === "choice") return { type: "choice", right: answer === q.correct, solution: q.correct };
  const gaps = gapAnswers(q);
  const given = Array.isArray(answer) ? answer : [];
  return {
    type: "gap",
    right: gaps.map((alts, i) => alts.some((a) => normalize(a) === normalize(given[i] ?? ""))),
    solution: gaps.map((alts) => alts[0]),
  };
}

// One point per choice question and one per gap.
export function score(checked: Checked[]) {
  let right = 0;
  let total = 0;
  for (const c of checked) {
    if (c.type === "choice") {
      total += 1;
      if (c.right) right += 1;
    } else {
      total += c.right.length;
      right += c.right.filter(Boolean).length;
    }
  }
  return { right, total };
}

// The student's answer as it arrives from the shared doc, checked against the question.
export function cleanAnswer(q: PublicQuestion, raw: unknown): Answer {
  if (q.type === "choice") {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n < q.options.length ? n : null;
  }
  const gaps = q.parts.filter((p) => p === null).length;
  if (!Array.isArray(raw)) return null;
  return Array.from({ length: gaps }, (_, i) => (typeof raw[i] === "string" ? raw[i].slice(0, 100) : ""));
}
