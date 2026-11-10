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
import { muteMicrophones } from "@/lib/mute";
import { useWindowWidth } from "@/lib/useStored";
import { cap, type RoomModel } from "./roomModel";
import { deviceProblemMessage } from "./StatusBanner";

export function useDeviceErrorHandler(onProblem: (message: string) => void) {
  return ({ source, error }: { source: Track.Source; error: Error }) =>
    onProblem(
      deviceProblemMessage(
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
  const teacher = model.role === "teacher";
  const onDeviceError = useDeviceErrorHandler(onProblem);
  // Tablet-sized windows: icons only (each keeps its tooltip and label).
  const iconOnly = useWindowWidth() < 1024;

  return (
    <div className="room-controls flex h-14 shrink-0 items-center gap-2 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink font-display text-sm font-extrabold text-marker"
        >
          T
        </span>
        <span className="truncate text-sm text-ink-muted">Lesson with {model.otherName}</span>
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
        <DeviceToggle source={Track.Source.Microphone} kind="audioinput" label="Microphone" onDeviceError={onDeviceError} />
        <DeviceToggle source={Track.Source.Camera} kind="videoinput" label="Camera" onDeviceError={onDeviceError} />
        {/* Only the teacher shares her screen (docs/DESIGN.md). */}
        {teacher && <ShareToggle />}
        <DisconnectButton aria-label="Leave the lesson" title="Leave the lesson">
          <LogOut size={16} aria-hidden />
          {!iconOnly && "Leave"}
        </DisconnectButton>
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
  onDeviceError,
}: {
  source: Track.Source.Microphone | Track.Source.Camera;
  kind: MediaDeviceKind;
  label: string;
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
        <MediaDeviceMenu kind={kind} aria-label={`Choose a ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}

function ShareToggle() {
  const { isScreenShareEnabled } = useLocalParticipant();
  const label = isScreenShareEnabled ? "Stop sharing your screen" : "Share your screen";
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
      aria-label={iconOnly ? `Mute ${name}` : undefined}
      title={`Mute ${name}`}
    >
      <MicOff size={iconSize} aria-hidden />
      {!iconOnly && `Mute ${name}`}
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
  const micOff = useIsMuted({ participant, source: Track.Source.Microphone });
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label={iconOnly ? `Mute ${name}` : undefined}
      title={micOff ? `${name}'s microphone is off` : `Turn ${name}'s microphone off`}
      disabled={busy || micOff}
      onClick={() => {
        setBusy(true);
        muteMicrophones(lessonId)
          .catch(() => onProblem("Muting didn't work. Please try again."))
          .finally(() => setBusy(false));
      }}
    >
      <MicOff size={iconSize} aria-hidden />
      {!iconOnly && `Mute ${name}`}
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
  const label = canEdit ? `${cap(name)} can edit` : `${cap(name)} views only`;
  return (
    <button
      type="button"
      className={`lk-button student-edit-toggle ${canEdit ? "is-on" : ""}`}
      title={iconOnly ? `${label}. Click to change.` : `Let ${name} write and draw`}
      aria-label={iconOnly ? label : undefined}
      aria-pressed={canEdit}
      onClick={() => onChange(!canEdit)}
    >
      {iconOnly && !canEdit ? <PencilOff size={16} aria-hidden /> : <Pencil size={16} aria-hidden />}
      {!iconOnly && label}
    </button>
  );
}
