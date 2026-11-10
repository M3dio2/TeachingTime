import type * as Y from "yjs";
import type { Layout, TabId, Where } from "@/lib/room/tabs";
import type { TeacherSettings } from "@/lib/sync/useTeacherSettings";
import type { ViewSync } from "@/lib/sync/useViewSync";
import type { LessonAudio } from "@/lib/room/useLessonAudio";
import type { OnMute } from "./CameraTiles";
import type { RoomFile } from "./FilesPanel";

export type Role = "teacher" | "student";

// Teacher only: what she can change on the stage. The student gets none (she follows).
export type TabActions = {
  open: (id: TabId) => void;
  // A classroom file: "auto" = a click, "beside" or an index = a drop (lib/room/tabs.ts).
  openAt: (id: TabId, where: Where) => void;
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
  addFile?: (file: RoomFile) => void; // teacher: a file saved during the lesson (L2b)
  filesTitle: string; // "Anna's files"
  onMute?: OnMute;
  lessonId?: string;
  inviteSlug?: string; // for /api/resource-url (both roles)
  names: Record<string, string>; // file tab id → file name
  sync: ViewSync; // PDF scroll positions
  audio?: LessonAudio; // teacher only: play classroom audio for both (A1)
};

// "your student" at the start of a sentence.
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
