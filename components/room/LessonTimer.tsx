"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { useEffect, useRef } from "react";
import { endLessonCall } from "@/app/lesson/[id]/actions";
import { LESSON_WARNING_MINUTES, MAX_LESSON_HOURS } from "@/lib/limits";

// Teacher only: at most 3 hours per lesson while TeachingTime is on free plans (G1).
// A warning 10 minutes before, then the call ends for both. Counted from when the teacher
// connected; the token route also refuses to let anyone back into a lesson open for 3 hours.
export default function LessonTimer({ lessonId, onProblem }: { lessonId: string; onProblem: (m: string) => void }) {
  const connection = useConnectionState();
  const started = useRef<number | null>(null);

  useEffect(() => {
    if (connection !== ConnectionState.Connected) return;
    started.current ??= Date.now();
    const end = started.current + MAX_LESSON_HOURS * 3600_000;
    const warnAt = end - LESSON_WARNING_MINUTES * 60_000;
    const warn = setTimeout(
      () =>
        onProblem(
          `This lesson ends in ${LESSON_WARNING_MINUTES} minutes: ${MAX_LESSON_HOURS} hours is the most for one lesson while TeachingTime is free. You can start it again afterwards.`,
        ),
      Math.max(0, warnAt - Date.now()),
    );
    const stop = setTimeout(() => endLessonCall(lessonId), Math.max(0, end - Date.now()));
    return () => {
      clearTimeout(warn);
      clearTimeout(stop);
    };
  }, [connection, lessonId, onProblem]);

  return null;
}
