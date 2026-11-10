"use client";

import { DisconnectReason } from "livekit-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { leaveQuickCall } from "@/app/dashboard/actions";
import { markLeavingLesson } from "@/components/dashboard/DashboardBits";
import Button, { buttonClass } from "@/components/ui/Button";
import LessonRoom, { type SavedLesson } from "./LessonRoom";
import LoadingScreen from "./LoadingScreen";
import RoomMessage from "./RoomMessage";

export default function TeacherRoom({ lesson }: { lesson: SavedLesson }) {
  const lessonId = lesson.id;
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false); // the lesson was opened in another tab
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setToken(data.token);
        else setError(data.error ?? "Could not start the lesson");
      })
      .catch(() => setError("Could not start the lesson"));
    // Next keeps a left page alive but hidden (and re-runs this effect when you come back), so
    // start fresh: otherwise "Start lesson" for the same lesson showed "Leaving the lesson" forever.
    return () => {
      setToken(null);
      setLeaving(false);
      setReplaced(false);
      setError(null);
    };
  }, [lessonId]);

  if (error) {
    return <p className="p-4 text-danger">{error}</p>;
  }
  if (leaving) {
    return <LoadingScreen title="Leaving the lesson" />;
  }
  if (replaced) {
    return (
      <RoomMessage
        title="You joined this lesson in another tab."
        actions={
          <>
            {/* A reload loads the latest saved board before joining again. */}
            <Button onClick={() => window.location.reload()}>Continue here</Button>
            <Link href="/dashboard" className={buttonClass("secondary", "md")}>
              Back to dashboard
            </Link>
          </>
        }
      >
        Close this tab, or continue here to leave the other one.
      </RoomMessage>
    );
  }
  if (!token) {
    return <LoadingScreen title="Getting your lesson ready" />;
  }
  return (
    <LessonRoom
      token={token}
      role="teacher"
      lesson={lesson}
      onLeave={async (reason) => {
        if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
          setReplaced(true);
          return;
        }
        setLeaving(true);
        markLeavingLesson();
        // Quick calls (the unsaved kind) end when the teacher clicks Leave. A dropped
        // connection doesn't count.
        if (!lesson.saveBoard && reason === DisconnectReason.CLIENT_INITIATED) {
          await leaveQuickCall(lessonId).catch(() => {});
        }
        router.push("/dashboard");
      }}
    />
  );
}
