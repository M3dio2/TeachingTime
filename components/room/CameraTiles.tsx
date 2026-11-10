"use client";

import {
  ParticipantTile,
  type TrackReferenceOrPlaceholder,
  useIsMuted,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff } from "lucide-react";
import type { CSSProperties } from "react";
import Button from "@/components/ui/Button";

// Inline sizes everywhere: LiveKit's unlayered CSS beats Tailwind on .lk-* (docs/DESIGN.md).
const FILL: CSSProperties = { width: "100%", height: "100%" };

// The other person's camera and your own (placeholders while a camera is off).
export function useCameras() {
  const cameras = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });
  return {
    other: cameras.find((c) => !c.participant.isLocal),
    self: cameras.find((c) => c.participant.isLocal),
  };
}

export type OnMute = (identity: string) => void;

// A camera tile. For the teacher, the other person's tile shows a mute button on hover while
// their microphone is on (LiveKit can mute a microphone, but not switch it back on).
export function CameraTile({
  trackRef,
  style,
  onMute,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  style?: CSSProperties;
  onMute?: OnMute;
}) {
  const { participant } = trackRef;
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const canMute = onMute && !participant.isLocal && !micMuted;

  if (!canMute) return <ParticipantTile trackRef={trackRef} style={{ ...FILL, ...style }} />;
  return (
    <div className="group relative" style={{ ...FILL, ...style }}>
      <ParticipantTile trackRef={trackRef} style={FILL} />
      <Button
        variant="secondary"
        size="sm"
        title={`Mute ${participant.name || "this person"}`}
        aria-label={`Mute ${participant.name || "this person"}`}
        onClick={() => onMute(participant.identity)}
        className="absolute top-2 right-2 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <MicOff size={16} aria-hidden />
        Mute
      </Button>
    </div>
  );
}

// Desktop, 1024 px and wider: the other person on top, you below, 4:3.
export function CameraColumn({ width, onMute }: { width: number; onMute?: OnMute }) {
  const { other, self } = useCameras();
  return (
    <div
      aria-label="Cameras"
      className="flex min-w-0 shrink-0 flex-col gap-2"
      style={{ width }}
      data-testid="camera-column"
    >
      {[other, self].map(
        (cam) =>
          cam && (
            <div key={cam.participant.identity} style={{ aspectRatio: "4 / 3" }}>
              <CameraTile trackRef={cam} onMute={onMute} />
            </div>
          ),
      )}
    </div>
  );
}

// 768–1023 px: two small tiles float over the stage's top-right corner.
export function FloatingCameras() {
  const { other, self } = useCameras();
  const tile = "overflow-hidden rounded-md border-2 border-surface shadow-soft";
  return (
    <div
      data-testid="floating-cameras"
      className="pointer-events-none absolute top-3 right-3 z-10 flex w-[148px] flex-col gap-1.5"
    >
      {other && (
        <div className={tile} style={{ aspectRatio: "4 / 3" }}>
          <ParticipantTile trackRef={other} style={FILL} />
        </div>
      )}
      {self && (
        <div className={`${tile} w-[70%] self-end`} style={{ aspectRatio: "4 / 3" }}>
          <ParticipantTile trackRef={self} style={FILL} />
        </div>
      )}
    </div>
  );
}

// Phones: both cameras in a row, 16:9.
export function CameraRow() {
  const { other, self } = useCameras();
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2">
      {[other, self].map(
        (cam) =>
          cam && (
            <div key={cam.participant.identity} style={{ aspectRatio: "16 / 9" }}>
              <ParticipantTile trackRef={cam} style={FILL} />
            </div>
          ),
      )}
    </div>
  );
}

// Just talk: the two cameras fill the room (side by side; stacked on phones).
export function BigCameras({ stacked = false, onMute }: { stacked?: boolean; onMute?: OnMute }) {
  const { other, self } = useCameras();
  const cams = [other, self].filter((c): c is TrackReferenceOrPlaceholder => Boolean(c));
  return (
    <div
      className={`grid min-h-0 flex-1 gap-2 ${stacked ? "grid-rows-2" : "grid-cols-2"}`}
      style={cams.length === 1 ? { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" } : undefined}
    >
      {cams.map((cam) => (
        <div key={cam.participant.identity} className="min-h-0 min-w-0">
          <CameraTile trackRef={cam} onMute={onMute} />
        </div>
      ))}
    </div>
  );
}
