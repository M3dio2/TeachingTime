"use client";

import { useRoomContext } from "@livekit/components-react";
import { type RemoteParticipant, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { isTeacher } from "./useTeacherSettings";

const TOPIC = "view";
const SEND_MS = 100; // at most 10 messages a second
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Where the teacher is in each PDF tab: page index + fraction into that page (so screens of
// different widths line up). Too frequent for attributes, so it goes as lossy data messages,
// teacher → student, the latest one wins; everything is sent again (reliably) when someone
// joins. Only messages from the teacher count.
export type ViewSync = {
  // Teacher: report a new position. Student: undefined.
  report?: (tab: string, pos: number) => void;
  // The teacher's last known position in a tab (the teacher's own, or what the student follows).
  positionOf: (tab: string) => number | undefined;
};

export function useViewSync(isTeacherSelf: boolean): ViewSync {
  const room = useRoomContext();
  const mine = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [followed, setFollowed] = useState<Record<string, number>>({});

  const publish = useCallback(
    (entries: [string, number][], reliable: boolean) => {
      for (const [tab, pos] of entries) {
        room.localParticipant
          .publishData(encoder.encode(JSON.stringify({ tab, pos })), { reliable, topic: TOPIC })
          .catch(() => {});
      }
    },
    [room],
  );

  // Teacher: a newcomer (or a refreshed student) gets every position at once.
  useEffect(() => {
    if (!isTeacherSelf) return;
    const onJoin = () => publish([...mine.current.entries()], true);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [room, isTeacherSelf, publish]);

  // Student: follow the teacher.
  useEffect(() => {
    if (isTeacherSelf) return;
    const onData = (payload: Uint8Array, from?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (topic !== TOPIC || !isTeacher(from)) return;
      try {
        const { tab, pos } = JSON.parse(decoder.decode(payload));
        if (typeof tab === "string" && typeof pos === "number" && Number.isFinite(pos) && pos >= 0) {
          setFollowed((f) => (f[tab] === pos ? f : { ...f, [tab]: pos }));
        }
      } catch {
        // Ignore malformed messages.
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, isTeacherSelf]);

  const report = useCallback(
    (tab: string, pos: number) => {
      mine.current.set(tab, pos);
      pending.current.set(tab, pos);
      timer.current ??= setTimeout(() => {
        timer.current = null;
        const entries = [...pending.current.entries()];
        pending.current.clear();
        publish(entries, false);
      }, SEND_MS);
    },
    [publish],
  );

  return {
    report: isTeacherSelf ? report : undefined,
    positionOf: (tab) => (isTeacherSelf ? mine.current.get(tab) : followed[tab]),
  };
}
