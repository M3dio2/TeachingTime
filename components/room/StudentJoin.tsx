"use client";

import { DisconnectReason } from "livekit-client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Marker from "@/components/ui/Marker";
import Wordmark from "@/components/ui/Wordmark";
import { CameraPreview, type PreJoinTracks, useCameraCheck } from "./CameraCheck";
import LessonRoom from "./LessonRoom";
import RoomMessage from "./RoomMessage";

// Why the student is out of the room: they left, the teacher ended the call (the link is gone),
// or they joined from another device or tab (one student per lesson, see the token route).
type Exit = "left" | "ended" | "replaced";

export default function StudentJoin({ slug }: { slug: string }) {
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
      setError(data.error ?? "Could not join");
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
      <RoomMessage title="See you next time!" tick>
        The lesson has ended. You can close this page.
      </RoomMessage>
    );
  }
  if (exit === "replaced") {
    return (
      <RoomMessage
        title="You joined this lesson somewhere else."
        actions={
          <Button disabled={joining} onClick={() => join()}>
            {joining ? "Joining…" : "Continue here"}
          </Button>
        }
      >
        This lesson is open on another device or tab. Close this page, or continue here to move the
        lesson to this one.
      </RoomMessage>
    );
  }

  if (exit === "left") {
    return (
      <RoomMessage
        title="You left the lesson"
        actions={
          <Button disabled={joining} onClick={() => join()} className="h-12 w-full text-[17px] font-semibold">
            {joining ? "Joining…" : "Rejoin"}
          </Button>
        }
      >
        Left by mistake? Join again with the same name.
        {error && <span className="mt-2 block text-sm text-danger">{error}</span>}
      </RoomMessage>
    );
  }

  return <JoinCard name={name} setName={setName} joining={joining} error={error} onJoin={join} />;
}

// "Join your lesson": the camera check, the name and Join lesson.
function JoinCard({
  name,
  setName,
  joining,
  error,
  onJoin,
}: {
  name: string;
  setName: (name: string) => void;
  joining: boolean;
  error: string | null;
  onJoin: (tracks: PreJoinTracks | null) => void;
}) {
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
            Join your{" "}
            <span className="relative isolate inline-block">
              lesson
              <Marker
                shape="underline"
                delay={0.2}
                className="absolute -bottom-[0.15em] -left-[3%] -z-10 h-[0.3em] w-[106%]"
              />
            </span>
          </h1>
          <p className="text-ink-muted">Check your camera, type your name, and you&apos;re in.</p>
        </div>
        <Field
          label="Your name"
          placeholder="e.g. Anna"
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
          {joining ? "Joining…" : "Join lesson"}
        </Button>
        <p className="text-center text-[13px] leading-snug text-ink-muted">
          When your browser asks, allow the camera and microphone.
        </p>
      </form>
    </main>
  );
}
