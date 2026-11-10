import type * as Y from "yjs";
import type { Layout, TabId } from "@/lib/room/tabs";
import type { TeacherSettings } from "@/lib/sync/useTeacherSettings";
import type { OnMute } from "./CameraTiles";
import type { RoomFile } from "./FilesPanel";

export type Role = "teacher" | "student";

// Teacher only: what she can change on the stage. The student gets none (she follows).
export type TabActions = {
  open: (id: TabId) => void;
  close: (index: number) => void;
  pick: (index: number) => void;
  setLayout: (layout: Layout) => void;
  setJustTalk: (justTalk: boolean) => void;
  setStudentCanEdit: (canEdit: boolean) => void;
};

// Everything the desktop and phone layouts need, built once in LessonContent (LessonRoom.tsx).
export type RoomModel = {
  role: Role;
  doc: Y.Doc;
  // What the stage shows: the teacher's own state, or what the student follows.
  view: TeacherSettings;
  canEdit: boolean; // may I write and draw
  sharing: boolean; // someone shares a screen
  actions?: TabActions;
  otherName: string; // the other person: "Anna" for the teacher, "Laura" for the student
  files?: RoomFile[]; // teacher in a student lesson only
  filesTitle: string; // "Anna's files"
  onMute?: OnMute;
  lessonId?: string;
};

// "your student" at the start of a sentence.
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
