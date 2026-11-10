"use client";

import { useRoomContext } from "@livekit/components-react";
import { type Participant, RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";
import { type AudioState, cleanAudio } from "@/lib/room/audio";
import { cleanActive, cleanLayout, cleanTabs, INITIAL_TABS, type Layout, type TabId } from "@/lib/room/tabs";

// The role comes from the token metadata, which only the token route sets.
export function isTeacher(participant?: Participant) {
  try {
    return JSON.parse(participant?.metadata || "{}").role === "teacher";
  } catch {
    return false;
  }
}

// Everything the student follows: "student can edit" and what the stage shows.
export type TeacherSettings = {
  studentCanEdit: boolean;
  tabs: TabId[];
  active: number;
  layout: Layout;
  justTalk: boolean;
  audio: AudioState | null; // A1: what the teacher plays, if anything
};

export const INITIAL_SETTINGS: TeacherSettings = {
  studentCanEdit: false,
  tabs: INITIAL_TABS.tabs,
  active: INITIAL_TABS.active,
  layout: INITIAL_TABS.layout,
  justTalk: INITIAL_TABS.justTalk,
  audio: null,
};

// LiveKit attributes are strings.
function encode(s: TeacherSettings): Record<string, string> {
  return {
    studentCanEdit: String(s.studentCanEdit),
    tabs: JSON.stringify(s.tabs),
    active: String(s.active),
    layout: s.layout,
    justTalk: String(s.justTalk),
    audio: s.audio ? JSON.stringify(s.audio) : "",
  };
}

function decode(attributes: Record<string, string>): TeacherSettings {
  const tabs = cleanTabs(attributes.tabs);
  return {
    studentCanEdit: attributes.studentCanEdit === "true",
    tabs,
    active: cleanActive(attributes.active, tabs.length),
    layout: cleanLayout(attributes.layout),
    justTalk: attributes.justTalk === "true",
    audio: cleanAudio(attributes.audio),
  };
}

// The teacher's settings live in her LiveKit participant attributes. Only the teacher's token
// may update its own attributes (canUpdateOwnMetadata), so a student can't change them. They
// aren't in the Y.Doc for that reason: the teacher accepts full-state diffs from the student
// (to recover after a refresh), and those can change anything.
//
// Teacher: pass her current settings; they're published (all keys in one call) on every change
// and on each (re)connect. Student: pass null; returns the teacher's settings. Every join
// starts from INITIAL_SETTINGS. When the teacher is gone, the student keeps the last tabs (no
// jump on a reconnect), but editing goes off.
export function useTeacherSettings(own: TeacherSettings | null): TeacherSettings {
  const room = useRoomContext();
  const [followed, setFollowed] = useState<TeacherSettings>(INITIAL_SETTINGS);
  const ownKey = own ? JSON.stringify(encode(own)) : null;

  useEffect(() => {
    if (!ownKey) return;
    const attributes = JSON.parse(ownKey) as Record<string, string>;
    const publish = () => room.localParticipant.setAttributes(attributes).catch(console.error);
    if (room.state === "connected") publish();
    room.on(RoomEvent.Connected, publish);
    return () => {
      room.off(RoomEvent.Connected, publish);
    };
  }, [room, ownKey]);

  const isFollower = own === null;
  useEffect(() => {
    if (!isFollower) return;
    const read = () => {
      const teacher = [...room.remoteParticipants.values()].find(isTeacher);
      setFollowed((prev) => {
        // Teacher gone: editing off and no audio, the tabs stay.
        const next = teacher ? decode(teacher.attributes) : { ...prev, studentCanEdit: false, audio: null };
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    };
    const events = [
      RoomEvent.Connected,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ParticipantAttributesChanged,
    ] as const;
    events.forEach((event) => room.on(event, read));
    read();
    return () => {
      events.forEach((event) => room.off(event, read));
    };
  }, [room, isFollower]);

  return own ?? followed;
}
