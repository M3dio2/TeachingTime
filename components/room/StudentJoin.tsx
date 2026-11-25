"use client";

import { DisconnectReason } from "livekit-client";
import { useState, useSyncExternalStore } from "react";
import { CalendarPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Marker from "@/components/ui/Marker";
import Wordmark from "@/components/ui/Wordmark";
import { useLocale, useT } from "@/lib/i18n/client";
import { downloadIcs, formatLesson, icsFile, upcoming } from "@/lib/schedule";
import { CameraPreview, type PreJoinTracks, useCameraCheck } from "./CameraCheck";
import LessonRoom from "./LessonRoom";
import RoomMessage from "./RoomMessage";

// Why the student is out of the room: they left, the teacher ended the call (the link is gone),
// or they joined from another device or tab (one student per lesson, see the token route).
type Exit = "left" | "ended" | "replaced";
const noop = () => () => {};

export type NextLessonInfo = { at: string; weekly: boolean; teacher: string } | null;

export default function StudentJoin({ slug, next = null }: { slug: string; next?: NextLessonInfo }) {
  const t = useT();
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [exit, setExit] = useState<Exit | null>(null);
  const [tracks, setTracks] = useState<PreJoinTracks | null>(null);

  // `preJoin`: the camera check's tracks (first join only; Rejoin lets LiveKit start new ones).
  async function join(preJoin?: PreJoinTracks | null) {
    setJoining(true);
    setError(null);
    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name }),
    });
    const data = await res.json();
    setJoining(false);
    if (!res.ok) {
      setError(data.error ?? t.room.couldNotJoin);
      return;
    }
    setExit(null);
    setTracks(preJoin ?? null);
    setToken(data.token);
  }

  if (token) {
    return (
      <LessonRoom
        token={token}
        role="student"
        inviteSlug={slug}
        tracks={tracks}
        onLeave={(reason) => {
          setToken(null);
          setExit(
            reason === DisconnectReason.ROOM_DELETED
              ? "ended"
              : reason === DisconnectReason.DUPLICATE_IDENTITY
                ? "replaced"
                : "left",
          );
        }}
      />
    );
  }

  if (exit === "ended") {
    return (
      <RoomMessage title={t.room.endedTitle} tick>
        {t.room.endedText}
      </RoomMessage>
    );
  }
  if (exit === "replaced") {
    return (
      <RoomMessage
        title={t.room.replacedTitle}
        actions={
          <Button disabled={joining} onClick={() => join()}>
            {joining ? t.room.joining : t.room.continueHere}
          </Button>
        }
      >
        {t.room.replacedText}
      </RoomMessage>
    );
  }

  if (exit === "left") {
    return (
      <RoomMessage
        title={t.room.leftTitle}
        actions={
          <Button disabled={joining} onClick={() => join()} className="h-12 w-full text-[17px] font-semibold">
            {joining ? t.room.joining : t.room.rejoin}
          </Button>
        }
      >
        {t.room.leftText}
        {error && <span className="mt-2 block text-sm text-danger">{error}</span>}
      </RoomMessage>
    );
  }

  return <JoinCard name={name} setName={setName} joining={joining} error={error} onJoin={join} next={next} slug={slug} />;
}

// "Join your lesson": the camera check, the name and Join lesson.
function JoinCard({
  name,
  setName,
  joining,
  error,
  onJoin,
  next,
  slug,
}: {
  name: string;
  setName: (name: string) => void;
  joining: boolean;
  error: string | null;
  onJoin: (tracks: PreJoinTracks | null) => void;
  next: NextLessonInfo;
  slug: string;
}) {
  const t = useT();
  const check = useCameraCheck();
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(check.handOver());
        }}
        className="flex w-full max-w-[440px] flex-col gap-5 rounded-panel border border-line bg-surface p-6"
      >
        <Wordmark size="sm" underline="none" />
        <CameraPreview check={check} />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.02em]">
            {t.room.joinTitle.before}
            <span className="relative isolate inline-block">
              {t.room.joinTitle.marked}
              <Marker
                shape="underline"
                delay={0.2}
                className="absolute -bottom-[0.15em] -left-[3%] -z-10 h-[0.3em] w-[106%]"
              />
            </span>
            {t.room.joinTitle.after}
          </h1>
          <p className="text-ink-muted">{t.room.joinIntro}</p>
        </div>
        <Field
          label={t.room.yourName}
          placeholder={t.room.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
          className="[&_input]:h-12 [&_input]:text-[17px]"
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button disabled={joining} className="h-12 text-[17px] font-semibold">
          {joining ? t.room.joining : t.room.joinLesson}
        </Button>
        <p className="text-center text-[13px] leading-snug text-ink-muted">
          {t.room.allowDevices}
        </p>
        {next && <StudentNextLesson next={next} slug={slug} />}
      </form>
    </main>
  );
}

// Review A4: "Your next lesson: Tue, 2 Dec, 17:00" (in the student's own time zone), with a
// calendar file. Hidden while it's the lesson's time anyway (they're joining it).
function StudentNextLesson({ next, slug }: { next: NonNullable<NextLessonInfo>; slug: string }) {
  const t = useT().plan;
  const locale = useLocale();
  const now = useSyncExternalStore(noop, () => Math.floor(Date.now() / 60000) * 60000, () => 0);
  const at = now ? upcoming(next.at, next.weekly, now) : null;
  if (!at || Math.abs(at.getTime() - now) < 30 * 60 * 1000) return null;
  const title = next.teacher ? t.calendarStudentTitle(next.teacher) : "TeachingTime";
  const link = `${window.location.origin}/join/${slug}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4" data-testid="student-next-lesson">
      <span className="flex flex-col">
        <span className="text-[13px] text-ink-muted">{t.studentNext}</span>
        <time dateTime={at.toISOString()} className="font-semibold">
          {formatLesson(at, locale)}
          {next.weekly && <span className="font-normal text-ink-muted"> · {t.everyWeek}</span>}
        </time>
      </span>
      <button
        type="button"
        onClick={() =>
          downloadIcs(title, icsFile({ uid: slug, title, start: at, url: link, weekly: next.weekly, description: t.calendarDescription(link) }))
        }
        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <CalendarPlus size={15} aria-hidden />
        {t.studentAddToCalendar}
      </button>
    </div>
  );
}
