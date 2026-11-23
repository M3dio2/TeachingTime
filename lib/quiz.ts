// Q1: quizzes. Shared by the dashboard editor, the server actions and the lesson room.
// Seven kinds of question (blocks in the editor):
// - "choice": 2–8 answers, one or more right (`correct` holds their indexes).
// - "truefalse": a statement, true or false.
// - "gap": a text with gaps to type in [brackets]; several right answers: [saw/watched].
// - "select": a text with a choice in each gap: [went|goed|go], the first is right.
// - "match": 2–10 pairs to match (left ↔ right).
// - "order": a sentence whose words, or a list (one item per line) whose items, go in order.
// - "open": free text; the teacher marks it right or wrong.
// The full quiz (with the answers) only ever reaches the teacher's browser. The student gets
// `publicQuestions` (no answers, answers mixed); the teacher's client checks and publishes the
// result. Mixing is seeded by the question id, so both sides compute the same order.

export const MAX_QUIZZES = 100; // per teacher (also in 0014_quizzes.sql)
export const MAX_QUESTIONS = 50;
export const MAX_TITLE = 80;
export const MAX_PROMPT = 300;
export const MAX_OPTION = 200;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
export const MAX_GAP_TEXT = 1000;
export const MAX_GAPS = 20;
export const MIN_PAIRS = 2;
export const MAX_PAIRS = 10;
export const MAX_ORDER_ITEMS = 15;
export const MAX_NOTE = 300; // hint, explanation, sample answer

export const QUESTION_TYPES = ["choice", "truefalse", "gap", "select", "match", "order", "open"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

type Common = { id: string; prompt: string; hint: string; explanation: string };
export type ChoiceQuestion = Common & { type: "choice"; options: string[]; correct: number[]; shuffle: boolean };
export type TrueFalseQuestion = Common & { type: "truefalse"; answer: boolean };
export type GapQuestion = Common & { type: "gap"; text: string };
export type SelectQuestion = Common & { type: "select"; text: string };
export type MatchQuestion = Common & { type: "match"; pairs: { left: string; right: string }[] };
export type OrderQuestion = Common & { type: "order"; mode: "sentence" | "list"; text: string };
export type OpenQuestion = Common & { type: "open"; sample: string };
export type Question =
  | ChoiceQuestion
  | TrueFalseQuestion
  | GapQuestion
  | SelectQuestion
  | MatchQuestion
  | OrderQuestion
  | OpenQuestion;
export type Quiz = { id: string; title: string; questions: Question[] };

// What the student sees: no answers, choices in display order.
type PublicCommon = { id: string; prompt: string; hint: string };
export type PublicQuestion =
  | (PublicCommon & { type: "choice"; options: string[]; multi: boolean })
  | (PublicCommon & { type: "truefalse" })
  | (PublicCommon & { type: "gap"; parts: (string | null)[] })
  | (PublicCommon & { type: "select"; parts: (string | null)[]; choices: string[][] })
  | (PublicCommon & { type: "match"; lefts: string[]; rights: string[] })
  | (PublicCommon & { type: "order"; tiles: string[]; joiner: " " | "\n" })
  | (PublicCommon & { type: "open" });

// An answer, by type: choice number[] (display indexes) · truefalse boolean · gap string[] ·
// select number[] (display index per gap, -1 = none) · match number[] (display index of the
// right item per left, -1 = none) · order number[] (tiles in the chosen order) · open string.
export type Answer = number[] | string[] | boolean | string | null;

// The teacher's check, in display terms (so the student's screen can show it).
export type Checked = { explanation?: string } & (
  | { type: "choice"; right: boolean; solution: number[] }
  | { type: "truefalse"; right: boolean; solution: boolean }
  | { type: "gap"; right: boolean[]; solution: string[] }
  | { type: "select"; right: boolean[]; solution: number[] }
  | { type: "match"; right: boolean[]; solution: number[] }
  | { type: "order"; right: boolean; solution: string }
  | { type: "open"; right: boolean }
);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const newId = () => crypto.randomUUID();
const common = (): Common => ({ id: newId(), prompt: "", hint: "", explanation: "" });

export function emptyQuestion(type: QuestionType): Question {
  switch (type) {
    case "choice":
      return { ...common(), type, options: ["", ""], correct: [0], shuffle: true };
    case "truefalse":
      return { ...common(), type, answer: true };
    case "gap":
      return { ...common(), type, text: "" };
    case "select":
      return { ...common(), type, text: "" };
    case "match":
      return { ...common(), type, pairs: [{ left: "", right: "" }, { left: "", right: "" }] };
    case "order":
      return { ...common(), type, mode: "sentence", text: "" };
    case "open":
      return { ...common(), type, sample: "" };
  }
}
export const emptyChoice = () => emptyQuestion("choice");

// Anything from the browser or the database, made safe. Incomplete questions are kept (the
// editor saves drafts); `isPlayable` decides what a lesson shows.
export function cleanQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  const out: Question[] = [];
  for (const q of raw.slice(0, MAX_QUESTIONS)) {
    if (!q || typeof q !== "object") continue;
    const r = q as Record<string, unknown>;
    const base: Common = {
      id: typeof r.id === "string" && /^[0-9a-f-]{36}$/.test(r.id) ? r.id : newId(),
      prompt: str(r.prompt, MAX_PROMPT),
      hint: str(r.hint, MAX_NOTE),
      explanation: str(r.explanation, MAX_NOTE),
    };
    switch (r.type) {
      case "choice": {
        const options = (Array.isArray(r.options) ? r.options : []).slice(0, MAX_OPTIONS).map((o) => str(o, MAX_OPTION));
        while (options.length < MIN_OPTIONS) options.push("");
        const given = Array.isArray(r.correct) ? r.correct : [r.correct]; // one number before v2
        const correct = [...new Set(given.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length))];
        out.push({ ...base, type: "choice", options, correct: correct.length ? correct : [0], shuffle: r.shuffle !== false });
        break;
      }
      case "truefalse":
        out.push({ ...base, type: "truefalse", answer: r.answer !== false });
        break;
      case "gap":
      case "select":
        out.push({ ...base, type: r.type, text: str(r.text, MAX_GAP_TEXT) });
        break;
      case "match": {
        const pairs = (Array.isArray(r.pairs) ? r.pairs : []).slice(0, MAX_PAIRS).map((p) => {
          const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
          return { left: str(o.left, MAX_OPTION), right: str(o.right, MAX_OPTION) };
        });
        while (pairs.length < MIN_PAIRS) pairs.push({ left: "", right: "" });
        out.push({ ...base, type: "match", pairs });
        break;
      }
      case "order":
        out.push({ ...base, type: "order", mode: r.mode === "list" ? "list" : "sentence", text: str(r.text, MAX_GAP_TEXT) });
        break;
      case "open":
        out.push({ ...base, type: "open", sample: str(r.sample, MAX_NOTE) });
        break;
    }
  }
  return out;
}

export const cleanTitle = (raw: unknown) => str(raw, MAX_TITLE).trim();

// "I [go/went] home." → ["I ", ["go", "went"], " home."]. "/" separates answers in every
// question type (the user's wish); "|" is still read, for quizzes saved before.
const SEP = /[/|]/;
export function parseGaps(text: string): (string | string[])[] {
  const parts: (string | string[])[] = [];
  const re = /\[([^[\]]*)\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const answers = m[1].split(SEP).map((a) => a.trim()).filter(Boolean);
    parts.push(answers.length ? answers : [""]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
const gapsOf = (q: GapQuestion | SelectQuestion) =>
  parseGaps(q.text).filter((p): p is string[] => Array.isArray(p));

export const orderItems = (q: OrderQuestion) =>
  (q.mode === "list" ? q.text.split("\n") : q.text.split(/\s+/)).map((s) => s.trim()).filter(Boolean);

// What's missing before a question can be used in a lesson (null: ready).
export type Problem =
  | "noPrompt"
  | "emptyOption"
  | "noGap"
  | "emptyGap"
  | "tooManyGaps"
  | "selectNeedsTwo"
  | "emptyPair"
  | "orderTooShort"
  | "orderTooLong";
export function questionProblem(q: Question): Problem | null {
  switch (q.type) {
    case "choice":
      if (!q.prompt.trim()) return "noPrompt";
      return q.options.some((o) => !o.trim()) ? "emptyOption" : null;
    case "truefalse":
    case "open":
      return q.prompt.trim() ? null : "noPrompt";
    case "gap":
    case "select": {
      const gaps = gapsOf(q);
      if (!gaps.length) return "noGap";
      if (gaps.length > MAX_GAPS) return "tooManyGaps";
      if (gaps.some((g) => !g[0])) return "emptyGap";
      if (q.type === "select" && gaps.some((g) => g.length < 2)) return "selectNeedsTwo";
      return null;
    }
    case "match":
      return q.pairs.some((p) => !p.left.trim() || !p.right.trim()) ? "emptyPair" : null;
    case "order": {
      const n = orderItems(q).length;
      return n < 2 ? "orderTooShort" : n > MAX_ORDER_ITEMS ? "orderTooLong" : null;
    }
  }
}
export const isPlayable = (q: Question) => questionProblem(q) === null;
export const playable = (questions: Question[]) => questions.filter(isPlayable);

// Same mixed order on both sides: a small PRNG seeded from the question id (+ a salt).
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// perm[display index] = original index. Never the original order when n > 1 (else mixing
// would sometimes leave the answer in place, e.g. an order question already solved).
function permutation(n: number, seed: string): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return perm;
  const rand = seeded(seed);
  for (let tries = 0; tries < 5; tries++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    if (perm.some((p, i) => p !== i)) return perm;
  }
  return perm.reverse();
}
const choicePerm = (q: ChoiceQuestion) =>
  q.shuffle ? permutation(q.options.length, q.id) : q.options.map((_, i) => i);
const selectPerms = (q: SelectQuestion) => gapsOf(q).map((g, i) => permutation(g.length, `${q.id}:${i}`));
const matchPerm = (q: MatchQuestion) => permutation(q.pairs.length, q.id);
const orderPerm = (q: OrderQuestion) => permutation(orderItems(q).length, q.id);

export function publicQuestion(q: Question): PublicQuestion {
  const base = { id: q.id, prompt: q.prompt, hint: q.hint };
  switch (q.type) {
    case "choice":
      return { ...base, type: "choice", options: choicePerm(q).map((i) => q.options[i]), multi: q.correct.length > 1 };
    case "truefalse":
      return { ...base, type: "truefalse" };
    case "gap":
      return { ...base, type: "gap", parts: parseGaps(q.text).map((p) => (Array.isArray(p) ? null : p)) };
    case "select": {
      const perms = selectPerms(q);
      return {
        ...base,
        type: "select",
        parts: parseGaps(q.text).map((p) => (Array.isArray(p) ? null : p)),
        choices: gapsOf(q).map((g, i) => perms[i].map((j) => g[j])),
      };
    }
    case "match":
      return { ...base, type: "match", lefts: q.pairs.map((p) => p.left), rights: matchPerm(q).map((i) => q.pairs[i].right) };
    case "order": {
      const items = orderItems(q);
      return { ...base, type: "order", tiles: orderPerm(q).map((i) => items[i]), joiner: q.mode === "list" ? "\n" : " " };
    }
    case "open":
      return { ...base, type: "open" };
  }
}
export const publicQuestions = (questions: Question[]) => playable(questions).map(publicQuestion);

// Lenient on case, spaces, curly apostrophes and a full stop at the end; strict on accents
// (in a language lesson "été" and "ete" are different answers).
export const normalize = (s: string) =>
  s.normalize("NFC").replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "").toLowerCase();

const nums = (a: Answer) => (Array.isArray(a) ? a.map(Number) : []);
const inverse = (perm: number[]) => {
  const inv: number[] = [];
  perm.forEach((orig, display) => (inv[orig] = display));
  return inv;
};

// `mark`: the teacher's verdict on an open answer (undefined: not marked yet).
export function checkQuestion(q: Question, answer: Answer, mark?: boolean): Checked {
  const explanation = q.explanation.trim() || undefined;
  switch (q.type) {
    case "choice": {
      const inv = inverse(choicePerm(q));
      const solution = q.correct.map((i) => inv[i]).sort((a, b) => a - b);
      const given = [...new Set(nums(answer))].sort((a, b) => a - b);
      return { type: "choice", right: given.join() === solution.join(), solution, explanation };
    }
    case "truefalse":
      return { type: "truefalse", right: answer === q.answer, solution: q.answer, explanation };
    case "gap": {
      const given = Array.isArray(answer) ? answer : [];
      const gaps = gapsOf(q);
      return {
        type: "gap",
        right: gaps.map((alts, i) => alts.some((a) => normalize(a) === normalize(String(given[i] ?? "")))),
        solution: gaps.map((alts) => alts[0]),
        explanation,
      };
    }
    case "select": {
      const solution = selectPerms(q).map((perm) => inverse(perm)[0]);
      const given = nums(answer);
      return { type: "select", right: solution.map((s, i) => given[i] === s), solution, explanation };
    }
    case "match": {
      const solution = inverse(matchPerm(q)); // left i's partner is right i, shown at solution[i]
      const given = nums(answer);
      return { type: "match", right: solution.map((s, i) => given[i] === s), solution, explanation };
    }
    case "order": {
      const items = orderItems(q);
      const tiles = orderPerm(q).map((i) => items[i]);
      const joiner = q.mode === "list" ? "\n" : " ";
      const given = nums(answer).map((i) => tiles[i] ?? "").join(joiner);
      const solution = items.join(joiner);
      return { type: "order", right: normalize(given) === normalize(solution), solution, explanation };
    }
    case "open":
      return { type: "open", right: mark === true, explanation };
  }
}

// One point per question; gap, select and match texts one per gap or pair.
export function score(checked: Checked[]) {
  let right = 0;
  let total = 0;
  for (const c of checked) {
    if (Array.isArray(c.right)) {
      total += c.right.length;
      right += c.right.filter(Boolean).length;
    } else {
      total += 1;
      if (c.right) right += 1;
    }
  }
  return { right, total };
}

// The student's answer as it arrives from the shared doc, checked against the question.
export function cleanAnswer(q: PublicQuestion, raw: unknown): Answer {
  const intIn = (v: unknown, n: number) => {
    const x = Number(v);
    return Number.isInteger(x) && x >= -1 && x < n ? x : -1;
  };
  switch (q.type) {
    case "choice":
      return Array.isArray(raw) ? [...new Set(raw.map((v) => intIn(v, q.options.length)).filter((v) => v >= 0))] : [];
    case "truefalse":
      return typeof raw === "boolean" ? raw : null;
    case "gap": {
      const gaps = q.parts.filter((p) => p === null).length;
      return Array.from({ length: gaps }, (_, i) =>
        Array.isArray(raw) && typeof raw[i] === "string" ? String(raw[i]).slice(0, 100) : "",
      );
    }
    case "select":
      return q.choices.map((c, i) => intIn(Array.isArray(raw) ? raw[i] : -1, c.length));
    case "match":
      return q.lefts.map((_, i) => intIn(Array.isArray(raw) ? raw[i] : -1, q.rights.length));
    case "order":
      return Array.isArray(raw) ? [...new Set(raw.map((v) => intIn(v, q.tiles.length)).filter((v) => v >= 0))] : [];
    case "open":
      return typeof raw === "string" ? raw.slice(0, 2000) : "";
  }
}

export function isAnswered(q: PublicQuestion, a: Answer): boolean {
  switch (q.type) {
    case "choice":
    case "order":
      return Array.isArray(a) && a.length > 0;
    case "truefalse":
      return typeof a === "boolean";
    case "gap":
      return Array.isArray(a) && a.some((s) => String(s).trim());
    case "select":
    case "match":
      return Array.isArray(a) && a.some((n) => Number(n) >= 0);
    case "open":
      return typeof a === "string" && a.trim() !== "";
  }
}
