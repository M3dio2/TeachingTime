"use client";

import { useState } from "react";
import type { Occurrence } from "@/lib/calendar";
import { LessonCard } from "./LessonActions";
import PlanDialog, { type Classroom } from "./PlanDialog";

type Open = { kind: "plan"; at?: Date } | { kind: "lesson"; occ: Occurrence } | { kind: "change"; occ: Occurrence } | null;

// The calendar's dialogs, shared by Today, the week and the Classroom page: plan a lesson,
// a lesson's card, change a lesson.
export function useLessonDialogs({
  classrooms,
  waiting,
  lessonId,
}: {
  classrooms: Classroom[];
  waiting: Set<string>;
  lessonId?: string;
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const byId = new Map(classrooms.map((c) => [c.id, c]));
  let node: React.ReactNode = null;
  if (open?.kind === "plan") node = <PlanDialog classrooms={classrooms} at={open.at} lessonId={lessonId} onClose={close} />;
  else if (open?.kind === "change") node = <PlanDialog classrooms={classrooms} editing={open.occ} onClose={close} />;
  else if (open?.kind === "lesson") {
    const room = byId.get(open.occ.lessonId);
    if (room)
      node = (
        <LessonCard
          occ={open.occ}
          classroom={room}
          waiting={waiting.has(room.id)}
          onChange={() => setOpen({ kind: "change", occ: open.occ })}
          onClose={close}
        />
      );
  }
  return {
    dialogs: node,
    plan: (at?: Date) => setOpen({ kind: "plan", at }),
    show: (occ: Occurrence) => setOpen({ kind: "lesson", occ }),
  };
}
