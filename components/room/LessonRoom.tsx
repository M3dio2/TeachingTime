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
import { ConnectionState, type DisconnectReason, MediaDeviceFailure, type RoomOptions, Track, VideoPresets } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { useT } from "@/lib/i18n/client";
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
  type TabId,
  type TabState,
} from "@/lib/room/tabs";
import type { VideoState } from "@/lib/room/links";
import { fromBase64 } from "@/lib/sync/base64";
import { useLessonPersistence } from "@/lib/sync/useLessonPersistence";
import { useNoteAutosave } from "@/lib/sync/useNoteAutosave";
import { isTeacher, type TeacherSettings, useTeacherSettings } from "@/lib/sync/useTeacherSettings";
import { useViewSync } from "@/lib/sync/useViewSync";
import { useFileNames } from "@/lib/room/fileCache";
import { useLessonAudio } from "@/lib/room/useLessonAudio";
import { useQuizNames } from "@/lib/room/quizDoc";
import { useYjsSync } from "@/lib/sync/useYjsSync";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import type { PreJoinTracks } from "./CameraCheck";
import DemoGuide from "@/components/demo/DemoGuide";
import DesktopRoom from "./DesktopRoom";
import type { RoomFile } from "./FilesPanel";
import JoinToast from "./JoinToast";
import LessonTimer from "./LessonTimer";
import LoadingScreen from "./LoadingScreen";
import PhoneLayout from "./PhoneLayout";
import { RecordingProvider } from "./Recording";
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
  // A1: the demo lesson (/demo): no call at all, a pretend student (components/demo).
  demo?: boolean;
};

// Video quality follows the size it's shown at: each camera is sent in 720p plus two smaller
// copies (180p, 360p); the other side receives only the copy that fits its tile (adaptive
// stream), so small cameras cost little data and Just Talk's big tiles get the full 720p.
// Copies nobody watches aren't sent at all (dynacast). Saves LiveKit data on the free plan.
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: { simulcast: true, videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360] },
};

export default function LessonRoom({ token, role, lesson, inviteSlug, onLeave, tracks, demo = false }: Props) {
  const t = useT();
  const [problem, setProblem] = useState<string | null>(null);
  const isPhone = useMediaQuery(PHONE_QUERY);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={!demo}
      options={ROOM_OPTIONS}
      video={!tracks && !demo}
      audio={!tracks && !demo}
      onDisconnected={onLeave}
      onMediaDeviceFailure={(failure, kind) => setProblem(deviceProblemMessage(t, failure, kind))}
      // Camera/mic failures also arrive here (e.g. "Permission denied by system" on macOS).
      onError={(error) => {
        const failure = MediaDeviceFailure.getFailure(error);
        setProblem(
          failure
            ? deviceProblemMessage(t, failure)
            : t.room.connectionError,
        );
      }}
      data-lk-theme="default"
      className="lesson-room flex flex-col"
      // Inline on purpose: LiveKit's unlayered `.lk-room-container { height: 100% }` beats
      // Tailwind's h-dvh, which collapsed the stage on phones.
      style={{ height: "100dvh" }}
    >
      {!demo && (
        <StatusBanner
          role={role}
          inviteSlug={lesson?.inviteSlug}
          problem={problem}
          onDismissProblem={() => setProblem(null)}
        />
      )}
      <RecordingProvider role={role}>
        {/* Review B17: a main landmark and a heading for screen readers. */}
        <h1 className="sr-only">{lesson?.title ? t.room.lessonWith(lesson.title) : t.room.yourLesson}</h1>
        <LessonContent
          role={role}
          lesson={lesson}
          inviteSlug={inviteSlug ?? lesson?.inviteSlug}
          isPhone={isPhone}
          onProblem={setProblem}
          demo={demo}
        />
      </RecordingProvider>
      {!demo && <JoinToast />}
      {!demo && <ConnectingScreen />}
      <RoomAudioRenderer />
      {tracks && <PublishTracks tracks={tracks} />}
      {role === "teacher" && lesson && !demo && <LessonTimer lessonId={lesson.id} onProblem={setProblem} />}
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
  demo,
}: {
  role: Role;
  lesson?: SavedLesson;
  inviteSlug?: string;
  isPhone: boolean;
  onProblem: (message: string) => void;
  demo: boolean;
}) {
  const t = useT();
  const teacher = role === "teacher";
  const [doc] = useState(() => {
    const doc = new Y.Doc();
    if (lesson?.snapshot) Y.applyUpdate(doc, fromBase64(lesson.snapshot));
    return doc;
  });

  // Teacher only: her tabs and "student can edit". Every join starts from the defaults.
  // Q1: quizzes in their own doc; the student may always answer (lib/room/quizDoc.ts).
  const [quizDoc] = useState(() => new Y.Doc());

  const [tabs, setTabs] = useState<TabState>(INITIAL_TABS);
  const [studentCanEdit, setStudentCanEdit] = useState(false);
  // G2: the teacher's YouTube player (play, pause, position), followed by the student.
  const [video, setVideo] = useState<VideoState | null>(null);
  // Teacher: whether her stage is wide enough for two tabs (Stage reports it).
  const [stageFits, setStageFits] = useState(true);

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
        // A phone, or a window too narrow for two tabs, shows one tab at a time, so that's
        // what the student sees too.
        layout: isPhone || !stageFits ? "single" : tabs.layout,
        justTalk: tabs.justTalk,
        audio: lessonAudio.state,
        // Only while that video's tab is open.
        video: video && tabs.tabs.includes(video.tab as TabId) ? video : null,
      }
    : null;
  const followed = useTeacherSettings(own);
  const view = own ? { ...own, layout: tabs.layout } : followed;

  // The teacher ignores live edits from the student while editing is off
  // (the student's UI is read-only then; this also stops a tampered client).
  useYjsSync(doc, "lesson", teacher ? () => studentCanEdit : undefined);
  useLessonPersistence(doc, lesson?.saveBoard ? lesson.id : undefined);
  // Review A5: the text pad also becomes a dated note in the Classroom.
  const noteSavedAt = useNoteAutosave(doc, teacher && lesson?.saveBoard ? lesson.id : undefined);
  useYjsSync(quizDoc, "quiz");

  const sync = useViewSync(teacher);
  // The classroom's files; "Save as new PDF" adds one during the lesson.
  const [files, setFiles] = useState<RoomFile[]>(lesson?.files ?? []);
  // File tab labels: the teacher knows her files; the student asks for the names.
  const known = lesson?.files
    ? Object.fromEntries(files.map((f) => [`${f.kind}:${f.id}`, f.name]))
    : undefined;
  const fileNames = useFileNames(inviteSlug, view.tabs, known);
  const quizNames = useQuizNames(quizDoc, view.tabs);
  const names = { ...quizNames, ...fileNames };

  const other = useRemoteParticipants()[0];
  const studentLesson = Boolean(lesson?.saveBoard) || demo;
  const otherName =
    other?.name || (teacher ? (studentLesson && lesson?.title) || t.room.yourStudent : t.room.yourTeacher);

  const model: RoomModel = {
    role,
    doc,
    quizDoc,
    view,
    canEdit: teacher || view.studentCanEdit,
    sharing,
    otherName,
    noteSavedAt,
    files: studentLesson ? files : undefined,
    addFile: (f) => setFiles((list) => [...list, f]),
    filesTitle: t.room.filesTitle(lesson?.title ?? ""),
    lessonId: demo ? undefined : lesson?.id,
    inviteSlug,
    names,
    sync,
    audio: teacher ? lessonAudio : undefined,
    setVideo: teacher ? setVideo : undefined,
    reportStageFits: teacher ? setStageFits : undefined,
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
      teacher && lesson && !demo
        ? (identity) =>
            muteMicrophones(lesson.id, identity).catch(() =>
              onProblem(t.room.muteFailed),
            )
        : undefined,
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {isPhone ? (
        <PhoneLayout model={model} onProblem={onProblem} />
      ) : (
        <>
          <DesktopRoom model={model} />
          <RoomControls model={model} onProblem={onProblem} />
        </>
      )}
      {demo && <DemoGuide model={model} isPhone={isPhone} />}
    </main>
  );
}

// Covers the room until the first connection is made. Later drops show the "Reconnecting…"
// banner instead (a different connection state).
function ConnectingScreen() {
  const connection = useConnectionState();
  return connection === ConnectionState.Connecting ? (
    <LoadingScreen />
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
