"use client";

import {
  DisconnectButton,
  MediaDeviceMenu,
  TrackToggle,
  useIsMuted,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { MediaDeviceFailure, type Participant, Track } from "livekit-client";
import { LogOut, MicOff, Pencil, PencilOff } from "lucide-react";
import { useState } from "react";
import { useDemo } from "@/components/demo/DemoContext";
import { useT } from "@/lib/i18n/client";
import { muteMicrophones } from "@/lib/mute";
import { useWindowWidth } from "@/lib/useStored";
import { cap, type RoomModel } from "./roomModel";
import { RecordButton } from "./Recording";
import { deviceProblemMessage } from "./StatusBanner";

export function useDeviceErrorHandler(onProblem: (message: string) => void) {
  const t = useT();
  return ({ source, error }: { source: Track.Source; error: Error }) =>
    onProblem(
      deviceProblemMessage(
        t,
        MediaDeviceFailure.getFailure(error),
        source === Track.Source.Microphone ? "audioinput" : "videoinput",
      ),
    );
}

// Desktop bottom bar: the lesson's name on the left; in the middle the teacher's own controls
// (Mute Anna, "Anna can edit"), then mic · camera · share (teacher) · Leave.
export default function RoomControls({
  model,
  onProblem,
}: {
  model: RoomModel;
  onProblem: (message: string) => void;
}) {
  const t = useT();
  const teacher = model.role === "teacher";
  const onDeviceError = useDeviceErrorHandler(onProblem);
  // Tablet-sized windows: icons only (each keeps its tooltip and label).
  const iconOnly = useWindowWidth() < 1024;
  const demo = useDemo();

  return (
    <div className="room-controls flex h-14 shrink-0 items-center gap-2 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink font-display text-sm font-extrabold text-marker"
        >
          T
        </span>
        <span className="truncate text-sm text-ink-muted">{t.room.lessonWith(model.otherName)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {teacher && model.actions && (
          <>
            {model.lessonId && (
              <MuteStudentButton
                lessonId={model.lessonId}
                name={model.otherName}
                onProblem={onProblem}
                iconOnly={iconOnly}
              />
            )}
            <StudentCanEditToggle
              name={model.otherName}
              canEdit={model.view.studentCanEdit}
              onChange={model.actions.setStudentCanEdit}
              iconOnly={iconOnly}
            />
            <span aria-hidden className="mx-1 h-6 w-px bg-line" />
          </>
        )}
        {demo ? (
          // A1: the demo has no call: no devices, sharing or recording.
          <>
            <span className="inline-flex h-9 items-center rounded-full bg-marker-soft px-3 text-sm font-semibold text-marker-ink">
              {t.demo.badge}
            </span>
            <button type="button" className="lk-button" aria-label={t.demo.leave} title={t.demo.leave} onClick={demo.onLeave}>
              <LogOut size={16} aria-hidden />
              {!iconOnly && t.demo.leave}
            </button>
          </>
        ) : (
          <>
            <DeviceToggle
              source={Track.Source.Microphone}
              kind="audioinput"
              label={t.room.microphone}
              menuLabel={t.room.chooseMicrophone}
              onDeviceError={onDeviceError}
            />
            <DeviceToggle
              source={Track.Source.Camera}
              kind="videoinput"
              label={t.room.camera}
              menuLabel={t.room.chooseCamera}
              onDeviceError={onDeviceError}
            />
            {/* Only the teacher shares her screen (docs/DESIGN.md). */}
            {teacher && <ShareToggle />}
            {teacher && <RecordButton iconOnly={iconOnly} />}
            <DisconnectButton aria-label={t.room.leaveLesson} title={t.room.leaveLesson}>
              <LogOut size={16} aria-hidden />
              {!iconOnly && t.room.leave}
            </DisconnectButton>
          </>
        )}
      </div>
      <span className="flex-1" />
    </div>
  );
}

type OnDeviceError = ReturnType<typeof useDeviceErrorHandler>;

// Mic or camera with LiveKit's device picker next to it (as in LiveKit's ControlBar, but labelled).
function DeviceToggle({
  source,
  kind,
  label,
  menuLabel,
  onDeviceError,
}: {
  source: Track.Source.Microphone | Track.Source.Camera;
  kind: MediaDeviceKind;
  label: string;
  menuLabel: string;
  onDeviceError: OnDeviceError;
}) {
  return (
    <div className="lk-button-group">
      <TrackToggle
        source={source}
        showIcon
        aria-label={label}
        title={label}
        onDeviceError={(error) => onDeviceError({ source, error })}
      />
      <div className="lk-button-group-menu">
        <MediaDeviceMenu kind={kind} aria-label={menuLabel} />
      </div>
    </div>
  );
}

function ShareToggle() {
  const t = useT();
  const { isScreenShareEnabled } = useLocalParticipant();
  const label = isScreenShareEnabled ? t.room.stopSharing : t.room.shareScreen;
  return (
    <TrackToggle
      source={Track.Source.ScreenShare}
      showIcon
      aria-label={label}
      title={label}
      captureOptions={{ audio: true, selfBrowserSurface: "include" }}
    />
  );
}

// Mutes the student's microphone through the server (lib/mute.ts). Disabled while nobody's
// there or the microphone is already off (LiveKit can't switch it back on).
export function MuteStudentButton({
  lessonId,
  name,
  onProblem,
  className = "lk-button",
  iconSize = 16,
  iconOnly = false,
}: {
  lessonId: string;
  name: string;
  onProblem: (message: string) => void;
  className?: string;
  iconSize?: number;
  iconOnly?: boolean;
}) {
  const t = useT();
  const student = useRemoteParticipants()[0];
  return student ? (
    <MuteButton
      participant={student}
      lessonId={lessonId}
      name={name}
      onProblem={onProblem}
      className={className}
      iconSize={iconSize}
      iconOnly={iconOnly}
    />
  ) : (
    <button
      type="button"
      className={className}
      disabled
      aria-label={iconOnly ? t.room.mute(name) : undefined}
      title={t.room.mute(name)}
    >
      <MicOff size={iconSize} aria-hidden />
      {!iconOnly && t.room.mute(name)}
    </button>
  );
}

function MuteButton({
  participant,
  lessonId,
  name,
  onProblem,
  className,
  iconSize,
  iconOnly,
}: {
  participant: Participant;
  lessonId: string;
  name: string;
  onProblem: (message: string) => void;
  className: string;
  iconSize: number;
  iconOnly: boolean;
}) {
  const t = useT();
  const micOff = useIsMuted({ participant, source: Track.Source.Microphone });
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label={iconOnly ? t.room.mute(name) : undefined}
      title={micOff ? t.room.micIsOff(name) : t.room.turnMicOff(name)}
      disabled={busy || micOff}
      onClick={() => {
        setBusy(true);
        muteMicrophones(lessonId)
          .catch(() => onProblem(t.room.muteFailed))
          .finally(() => setBusy(false));
      }}
    >
      <MicOff size={iconSize} aria-hidden />
      {!iconOnly && t.room.mute(name)}
    </button>
  );
}

// Published in the teacher's attributes, so the student's editors follow it
// (lib/sync/useTeacherSettings.ts).
function StudentCanEditToggle({
  name,
  canEdit,
  onChange,
  iconOnly,
}: {
  name: string;
  canEdit: boolean;
  onChange: (canEdit: boolean) => void;
  iconOnly: boolean;
}) {
  const t = useT();
  // Review B5: a switch named for what it allows ("Anna can write and draw", on or off),
  // instead of a button whose text changed between two states.
  const label = t.room.canWriteAndDraw(cap(name));
  return (
    <button
      type="button"
      role="switch"
      aria-checked={canEdit}
      className={`lk-button student-edit-toggle ${canEdit ? "is-on" : ""}`}
      title={t.room.letWriteAndDraw(name)}
      aria-label={label}
      onClick={() => onChange(!canEdit)}
    >
      {canEdit ? <Pencil size={16} aria-hidden /> : <PencilOff size={16} aria-hidden />}
      {!iconOnly && <span aria-hidden>{label}</span>}
      <span
        aria-hidden
        className={`relative ml-0.5 inline-block h-4 w-7 shrink-0 rounded-full transition-colors ${canEdit ? "bg-white/90" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full transition-[left] ${canEdit ? "left-3.5 bg-ok" : "left-0.5 bg-ink-muted"}`}
        />
      </span>
    </button>
  );
}
