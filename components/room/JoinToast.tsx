"use client";

import { useRoomContext } from "@livekit/components-react";
import { type RemoteParticipant, RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

const SHOW_MS = 2600; // matches the toast animation in app/globals.css

// A small "Anna joined" note at the top when someone arrives. People already in the room when
// we connect don't count (LiveKit doesn't announce them).
export default function JoinToast() {
  const room = useRoomContext();
  const t = useT();
  const someone = t.room.someone;
  const [joined, setJoined] = useState<{ name: string; key: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onJoin = (participant: RemoteParticipant) => {
      setJoined({ name: participant.name || someone, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setJoined(null), SHOW_MS);
    };
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      clearTimeout(timer);
    };
  }, [room, someone]);

  if (!joined) return null;
  return (
    <p
      key={joined.key}
      role="status"
      className="join-toast pointer-events-none fixed top-3 left-1/2 z-40 rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-ink shadow-soft"
    >
      {t.room.joined(joined.name)}
    </p>
  );
}
