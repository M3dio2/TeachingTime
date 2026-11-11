"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, type DisconnectReason, MediaDeviceFailure, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { muteMicrophones } from "@/lib/mute";
import {
  closeTab,
  INITIAL_TABS,
  openTab,
  openTabAt,
  pickTab,
  screenStarted,
  screenStopped,
  setJustTalk,
  setLayout,
  type TabState,
} from "@/lib/room/tabs";
import { fromBase64 } from "@/lib/sync/base64";
import { useLessonPersistence } from "@/lib/sync/useLessonPersistence";
import { isTeacher, type TeacherSettings, useTeacherSettings } from "@/lib/sync/useTeacherSettings";
import { useViewSync } from "@/lib/sync/useViewSync";
import { useFileNames } from "@/lib/room/fileCache";
import { useLessonAudio } from "@/lib/room/useLessonAudio";
import { useYjsSync } from "@/lib/sync/useYjsSync";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import type { PreJoinTracks } from "./CameraCheck";
import DesktopRoom from "./DesktopRoom";
import type { RoomFile } from "./FilesPanel";
import JoinToast from "./JoinToast";
import LessonTimer from "./LessonTimer";
import LoadingScreen from "./LoadingScreen";
import PhoneLayout from "./PhoneLayout";
import RoomControls from "./RoomControls";
import type { Role, RoomModel } from "./roomModel";
import StatusBanner, { deviceProblemMessage } from "./StatusBanner";

export type { Role } from "./roomModel";

// Teacher only: the lesson to load from and save to Supabase.
export type SavedLesson = {
  id: string;
  inviteSlug: string;
  title: string; // the student's name (classrooms) or the quick call's title
  files?: RoomFile[]; // the classroom's files, for the files panel (student lessons only)
  snapshot: string | null; // null = start with a clean board
  saveBoard: boolean; // quick calls aren't saved
};

type Props = {
  token: string;
  role: Role;
  lesson?: SavedLesson;
  inviteSlug?: string; // student: the link she joined with (teacher: lesson.inviteSlug)
  onLeave: (reason?: DisconnectReason) => void;
  // Student: the tracks from the join card's camera check, published as they are.
  tracks?: PreJoinTracks | null;
};

export default function LessonRoom({ token, role, lesson, inviteSlug, onLeave, tracks }: Props) {
  const [problem, setProblem] = useState<string | null>(null);
  const isPhone = useMediaQuery(PHONE_QUERY);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect
      video={!tracks}
      audio={!tracks}
      onDisconnected={onLeave}
      onMediaDeviceFailure={(failure, kind) => setProblem(deviceProblemMessage(failure, kind))}
      // Camera/mic failures also arrive here (e.g. "Permission denied by system" on macOS).
      onError={(error) => {
        const failure = MediaDeviceFailure.getFailure(error);
        setProblem(
          failure
            ? deviceProblemMessage(failure)
            : "Something went wrong with the connection. Check your internet and reload.",
        );
      }}
      data-lk-theme="default"
      className="lesson-room flex flex-col"
      // Inline on purpose: LiveKit's unlayered `.lk-room-container { height: 100% }` beats
      // Tailwind's h-dvh, which collapsed the stage on phones.
      style={{ height: "100dvh" }}
    >
      <StatusBanner
        role={role}
        inviteSlug={lesson?.inviteSlug}
        problem={problem}
        onDismissProblem={() => setProblem(null)}
      />
      <LessonContent
        role={role}
        lesson={lesson}
        inviteSlug={inviteSlug ?? lesson?.inviteSlug}
        isPhone={isPhone}
        onProblem={setProblem}
      />
      <JoinToast />
      <ConnectingScreen />
      <RoomAudioRenderer />
      {tracks && <PublishTracks tracks={tracks} />}
      {role === "teacher" && lesson && <LessonTimer lessonId={lesson.id} onProblem={setProblem} />}
    </LiveKitRoom>
  );
}

// The lesson Y.Doc holds everything shared that's written: the text pad (Tiptap's default XML
// fragment) and "board" (whiteboard elements). What the stage shows and "student can edit" are
// the teacher's LiveKit attributes instead (lib/sync/useTeacherSettings.ts).
// It lives inside LiveKitRoom so it can sync over the room's data channel. The teacher's doc
// starts from the saved snapshot; the student's starts empty and is filled by the peer.
function LessonContent({
  role,
  lesson,
  inviteSlug,
  isPhone,
  onProblem,
}: {
  role: Role;
  lesson?: SavedLesson;
  inviteSlug?: string;
  isPhone: boolean;
  onProblem: (message: string) => void;
}) {
  const teacher = role === "teacher";
  const [doc] = useState(() => {
    const doc = new Y.Doc();
    if (lesson?.snapshot) Y.applyUpdate(doc, fromBase64(lesson.snapshot));
    return doc;
  });

  // Teacher only: her tabs and "student can edit". Every join starts from the defaults.
  const [tabs, setTabs] = useState<TabState>(INITIAL_TABS);
  const [studentCanEdit, setStudentCanEdit] = useState(false);

  // A screen share opens the Screen tab and closing it gives the replaced tab back
  // (lib/room/tabs.ts). Adjusted while rendering, React's way to follow a changing value.
  // Only the teacher shares (her token is the only one allowed to publish a screen). A screen
  // track from anyone else is ignored, so a tampered student client can't open the Screen tab.
  const sharing = useTracks([Track.Source.ScreenShare]).some((t) =>
    t.participant.isLocal ? teacher : isTeacher(t.participant),
  );
  const [seenSharing, setSeenSharing] = useState(false);
  if (teacher && sharing !== seenSharing) {
    setSeenSharing(sharing);
    setTabs((t) => (sharing ? screenStarted(t) : screenStopped(t)));
  }

  // A1: the teacher's audio player (its track and state); unused on the student's side.
  const lessonAudio = useLessonAudio(teacher ? inviteSlug : undefined);

  const own: TeacherSettings | null = teacher
    ? {
        studentCanEdit,
        tabs: tabs.tabs,
        active: tabs.active,
        // A phone shows one tab at a time, so that's what the student sees too.
        layout: isPhone ? "single" : tabs.layout,
        justTalk: tabs.justTalk,
        audio: lessonAudio.state,
      }
    : null;
  const followed = useTeacherSettings(own);
  const view = own ? { ...own, layout: tabs.layout } : followed;

  // The teacher ignores live edits from the student while editing is off
  // (the student's UI is read-only then; this also stops a tampered client).
  useYjsSync(doc, "lesson", teacher ? () => studentCanEdit : undefined);
  useLessonPersistence(doc, lesson?.saveBoard ? lesson.id : undefined);

  const sync = useViewSync(teacher);
  // The classroom's files; "Save as new PDF" adds one during the lesson.
  const [files, setFiles] = useState<RoomFile[]>(lesson?.files ?? []);
  // File tab labels: the teacher knows her files; the student asks for the names.
  const known = lesson?.files
    ? Object.fromEntries(files.map((f) => [`${f.kind}:${f.id}`, f.name]))
    : undefined;
  const names = useFileNames(inviteSlug, view.tabs, known);

  const other = useRemoteParticipants()[0];
  const studentLesson = Boolean(lesson?.saveBoard);
  const otherName =
    other?.name || (teacher ? (studentLesson && lesson?.title) || "your student" : "your teacher");

  const model: RoomModel = {
    role,
    doc,
    view,
    canEdit: teacher || view.studentCanEdit,
    sharing,
    otherName,
    files: studentLesson ? files : undefined,
    addFile: (f) => setFiles((list) => [...list, f]),
    filesTitle: `${lesson?.title ?? ""}'s files`,
    lessonId: lesson?.id,
    inviteSlug,
    names,
    sync,
    audio: teacher ? lessonAudio : undefined,
    actions: teacher
      ? {
          open: (id) => setTabs((t) => openTab(t, id)),
          openAt: (id, where) => setTabs((t) => openTabAt(t, id, where)),
          close: (i) => setTabs((t) => closeTab(t, i)),
          pick: (i) => setTabs((t) => pickTab(t, i)),
          setLayout: (l) => setTabs((t) => setLayout(t, l)),
          setJustTalk: (on) => setTabs((t) => setJustTalk(t, on)),
          setStudentCanEdit,
        }
      : undefined,
    // Teacher only: mutes a participant's microphone from their camera tile.
    onMute:
      teacher && lesson
        ? (identity) =>
            muteMicrophones(lesson.id, identity).catch(() =>
              onProblem("Muting didn't work. Please try again."),
            )
        : undefined,
  };

  return isPhone ? (
    <PhoneLayout model={model} onProblem={onProblem} />
  ) : (
    <>
      <DesktopRoom model={model} />
      <RoomControls model={model} onProblem={onProblem} />
    </>
  );
}

// Covers the room until the first connection is made. Later drops show the "Reconnecting…"
// banner instead (a different connection state).
function ConnectingScreen() {
  const connection = useConnectionState();
  return connection === ConnectionState.Connecting ? (
    <LoadingScreen title="Getting your lesson ready" />
  ) : null;
}

// Publishes the join card's tracks once connected (muted ones stay muted, so the choice carries
// over). LiveKit stops them when the room disconnects.
function PublishTracks({ tracks }: { tracks: PreJoinTracks }) {
  const room = useRoomContext();
  const connection = useConnectionState();
  const done = useRef(false);
  useEffect(() => {
    if (connection !== ConnectionState.Connected || done.current) return;
    done.current = true;
    for (const track of [tracks.audio, tracks.video]) {
      if (track) room.localParticipant.publishTrack(track).catch(() => {});
    }
  }, [connection, room, tracks]);
  return null;
}
