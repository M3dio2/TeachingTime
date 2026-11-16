"use client";

import {
  useConnectionState,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import {
  ConnectionState,
  MediaDeviceFailure,
  type RemoteParticipant,
  RoomEvent,
  Track,
  type TrackPublication,
} from "livekit-client";
import { useEffect, useState } from "react";
import { MUTED_BY_TEACHER_TOPIC } from "@/lib/mute";
import CopyLinkButton from "@/components/CopyLinkButton";
import { useT } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import type { Role } from "./LessonRoom";

// Turns a camera/microphone failure into advice the teacher or student can act on.
export function deviceProblemMessage(t: Messages, failure?: MediaDeviceFailure, kind?: MediaDeviceKind) {
  const device = kind === "videoinput" ? "camera" : kind === "audioinput" ? "microphone" : "either";
  switch (failure) {
    case MediaDeviceFailure.PermissionDenied:
      return t.room.device.blocked(device);
    case MediaDeviceFailure.NotFound:
      return t.room.device.notFound(device);
    case MediaDeviceFailure.DeviceInUse:
      return t.room.device.inUse(device);
    default:
      return t.room.device.failed(device);
  }
}

// Student: true from "your teacher muted you" until the microphone is switched on again.
function useMutedByTeacher(enabled: boolean) {
  const room = useRoomContext();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Only the server sends this (app/api/mute), so a message from a participant is ignored.
    const onData = (
      _payload: Uint8Array,
      from: RemoteParticipant | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic === MUTED_BY_TEACHER_TOPIC && !from) setMuted(true);
    };
    const onUnmuted = (publication: TrackPublication) => {
      if (publication.source === Track.Source.Microphone) setMuted(false);
    };
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.TrackUnmuted, onUnmuted);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.TrackUnmuted, onUnmuted);
    };
  }, [room, enabled]);

  return [muted, () => setMuted(false)] as const;
}

// One line above the lesson: connection problems first, then "waiting for the other person",
// then a device problem (dismissable), then "your teacher muted you" (student, dismissable).
export default function StatusBanner({
  role,
  inviteSlug,
  problem,
  onDismissProblem,
}: {
  role: Role;
  inviteSlug?: string;
  problem: string | null;
  onDismissProblem: () => void;
}) {
  const t = useT();
  const connection = useConnectionState();
  const others = useRemoteParticipants();
  const [mutedByTeacher, dismissMuted] = useMutedByTeacher(role === "student");

  if (
    connection === ConnectionState.Reconnecting ||
    connection === ConnectionState.SignalReconnecting
  ) {
    return <Banner tone="warning">{t.room.reconnecting}</Banner>;
  }
  if (problem) {
    return (
      <Banner tone="error" onDismiss={onDismissProblem}>
        {problem}
      </Banner>
    );
  }
  if (mutedByTeacher) {
    return (
      <Banner tone="info" onDismiss={dismissMuted}>
        {t.room.mutedByTeacher}
      </Banner>
    );
  }
  if (connection === ConnectionState.Connected && others.length === 0) {
    return (
      <Banner
        tone="info"
        action={role === "teacher" && inviteSlug ? <CopyLinkButton slug={inviteSlug} /> : undefined}
      >
        {role === "teacher"
          ? t.room.waitingForStudent
          : t.room.waitingForTeacher}
      </Banner>
    );
  }
  return null;
}

function Banner({
  tone,
  children,
  action,
  onDismiss,
}: {
  tone: "info" | "warning" | "error";
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const colors = {
    info: "border-line bg-surface-2 text-ink",
    warning: "border-warn/30 bg-warn-soft text-warn",
    error: "border-danger/30 bg-danger-soft text-danger",
  }[tone];
  const t = useT();

  return (
    <div
      className={`mx-2 mt-2 flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${colors}`}
    >
      <p className="flex-1 self-center">{children}</p>
      {action}
      {onDismiss && (
        <button onClick={onDismiss} aria-label={t.room.dismiss} className="opacity-70 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}
