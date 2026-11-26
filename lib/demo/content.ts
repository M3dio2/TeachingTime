import type { RoomFile } from "@/components/room/FilesPanel";
import type { Answer, PublicQuestion, Quiz } from "@/lib/quiz";

// Review A1: the demo lesson (/demo). No account, no LiveKit call, nothing saved: the room runs
// in the visitor's browser with a pretend student, Lucía, who reacts to what the teacher does
// (components/demo/DemoGuide.tsx). The material is a real English lesson on the past simple.

export const DEMO_SLUG = "demo"; // stands in for an invite slug; lib/room/fileCache.ts serves these
export const DEMO_STUDENT = "Lucía";

// Ids are UUIDs like real files (tab ids are checked, lib/room/tabs.ts).
export const DEMO_IDS = {
  worksheet: "00000000-0000-4000-8000-0000000000d1",
  picture: "00000000-0000-4000-8000-0000000000d2",
  audio: "00000000-0000-4000-8000-0000000000d3",
  quiz: "00000000-0000-4000-8000-0000000000d4",
} as const;

// Files served from /public/demo (the fox recording: LibriVox, public domain).
export const DEMO_FILE_INFO: Record<string, { name: string; kind: "pdf" | "image" | "audio"; url: string }> = {
  [DEMO_IDS.worksheet]: { name: "Worksheet – Past simple.pdf", kind: "pdf", url: "/demo/worksheet-past-simple.pdf" },
  [DEMO_IDS.picture]: { name: "The fox and the grapes.svg", kind: "image", url: "/demo/fox-and-the-grapes.svg" },
  [DEMO_IDS.audio]: { name: "The fox and the grapes (listening).mp3", kind: "audio", url: "/demo/fox-and-the-grapes.mp3" },
};

export const DEMO_QUIZ: Quiz = {
  id: DEMO_IDS.quiz,
  title: "Past simple: irregular verbs",
  questions: [
    {
      id: "demo-q1",
      type: "choice",
      prompt: "Yesterday I ___ to the cinema.",
      options: ["went", "goed", "have gone"],
      correct: [0],
      shuffle: false,
      hint: "",
      explanation: "",
    },
    {
      id: "demo-q2",
      type: "truefalse",
      prompt: "“Bought” is the past of “bring”.",
      answer: false,
      hint: "",
      explanation: "It’s “brought”. “Bought” comes from “buy”.",
    },
    {
      id: "demo-q3",
      type: "select",
      prompt: "Choose the right verbs.",
      text: "Last summer we [flew/flied] to Lisbon and [stayed/stood] near the sea.",
      hint: "",
      explanation: "",
    },
    {
      id: "demo-q4",
      type: "match",
      prompt: "Match the verbs with their past forms.",
      pairs: [
        { left: "eat", right: "ate" },
        { left: "drink", right: "drank" },
        { left: "write", right: "wrote" },
        { left: "swim", right: "swam" },
      ],
      hint: "",
      explanation: "",
    },
    {
      id: "demo-q5",
      type: "order",
      mode: "sentence",
      prompt: "Put the words in order.",
      text: "I saw an old friend yesterday",
      hint: "",
      explanation: "",
    },
  ],
};

const file = (id: string) => DEMO_FILE_INFO[id];
export const DEMO_FILES: RoomFile[] = [
  { id: DEMO_IDS.worksheet, kind: "pdf", name: file(DEMO_IDS.worksheet).name },
  { id: DEMO_IDS.picture, kind: "image", name: file(DEMO_IDS.picture).name, previewUrl: file(DEMO_IDS.picture).url },
  { id: DEMO_IDS.audio, kind: "audio", name: file(DEMO_IDS.audio).name },
  { id: DEMO_QUIZ.id, kind: "quiz", name: DEMO_QUIZ.title, quiz: DEMO_QUIZ },
];

// Lucía's answers, by value (the student's screen mixes options, see lib/quiz.ts). One is wrong
// on purpose (q2), so the teacher sees a red answer when she checks.
const PLAN: Record<string, (q: PublicQuestion) => Answer> = {
  "demo-q1": (q) => (q.type === "choice" ? [q.options.indexOf("went")] : null),
  "demo-q2": () => true,
  "demo-q3": (q) => (q.type === "select" ? q.choices.map((c, i) => c.indexOf(["flew", "stayed"][i])) : null),
  "demo-q4": (q) => (q.type === "match" ? ["ate", "drank", "wrote", "swam"].map((r) => q.rights.indexOf(r)) : null),
  "demo-q5": (q) => {
    if (q.type !== "order") return null;
    const left = q.tiles.map((tile, i) => ({ tile, i }));
    return "I saw an old friend yesterday".split(" ").map((w) => {
      const k = left.findIndex((x) => x.tile === w);
      return k < 0 ? -1 : left.splice(k, 1)[0].i;
    });
  },
};
export const luciaAnswer = (q: PublicQuestion): Answer => PLAN[q.id]?.(q) ?? null;

// What Lucía types into the text pad once she may write (one line per paragraph).
export const LUCIA_TEXT = ["Yesterday I went to the market.", "I bought some bread and I saw my friend Ana."];

// What Lucía says (speech bubbles on her camera). English: she's in an English lesson.
export const LUCIA_LINES = {
  hello: "Hi! I'm ready for our lesson.",
  worksheet: "Oh, the past simple worksheet!",
  picture: "A fox and grapes! The fox wanted the grapes, right?",
  boardAsk: "Can I draw too? Turn on “Lucía can write and draw”.",
  boardDraw: "I'll draw a little timeline for us.",
  justTalk: "Nice, now I can see you big!",
  audio: "I can hear it. A hungry fox…",
  write: "Thanks! I'll write my sentences in the text pad.",
  quiz: "A quiz! Give me a moment…",
  quizDone: "Done! How did I do?",
  checked: "Oh no, “brought”, not “bought”! I'll remember that.",
};
