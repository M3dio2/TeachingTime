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
import { useT } from "@/lib/i18n/client";
import { useDemo } from "@/components/demo/DemoContext";
import { LuciaTile, SelfDemoTile } from "@/components/demo/DemoTiles";
import Floating from "./Floating";

// Inline sizes everywhere: LiveKit's unlayered CSS beats Tailwind on .lk-* (docs/DESIGN.md).
const FILL: CSSProperties = { width: "100%", height: "100%" };

// The other person's camera and your own (placeholders while a camera is off). In the demo
// lesson (A1) two stand-ins: Lucía and the visitor (components/demo/DemoTiles.tsx).
const DEMO_OTHER = { participant: { identity: "demo-student", isLocal: false }, demo: "student" } as unknown as TrackReferenceOrPlaceholder;
const DEMO_SELF = { participant: { identity: "demo-self", isLocal: true }, demo: "self" } as unknown as TrackReferenceOrPlaceholder;
const demoOf = (ref: TrackReferenceOrPlaceholder) => (ref as { demo?: "student" | "self" }).demo;

export function useCameras() {
  const demo = useDemo();
  const cameras = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });
  if (demo) return { other: demo.here ? DEMO_OTHER : undefined, self: DEMO_SELF };
  return {
    other: cameras.find((c) => !c.participant.isLocal),
    self: cameras.find((c) => c.participant.isLocal),
  };
}

// LiveKit's tile, or the demo's stand-in.
function Tile({ trackRef, style, small }: { trackRef: TrackReferenceOrPlaceholder; style?: CSSProperties; small?: boolean }) {
  const demo = demoOf(trackRef);
  if (demo === "student") return <LuciaTile style={{ ...FILL, ...style }} small={small} />;
  if (demo === "self") return <SelfDemoTile style={{ ...FILL, ...style }} small={small} />;
  return <ParticipantTile trackRef={trackRef} style={{ ...FILL, ...style }} />;
}

export type OnMute = (identity: string) => void;

// A camera tile. For the teacher, the other person's tile shows a mute button on hover while
// their microphone is on (LiveKit can mute a microphone, but not switch it back on).
export function CameraTile(props: { trackRef: TrackReferenceOrPlaceholder; style?: CSSProperties; onMute?: OnMute }) {
  return demoOf(props.trackRef) ? <Tile trackRef={props.trackRef} style={props.style} /> : <LiveCameraTile {...props} />;
}

function LiveCameraTile({
  trackRef,
  style,
  onMute,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  style?: CSSProperties;
  onMute?: OnMute;
}) {
  const t = useT();
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
        title={t.room.mute(participant.name || t.room.thisPerson)}
        aria-label={t.room.mute(participant.name || t.room.thisPerson)}
        onClick={() => onMute(participant.identity)}
        className="absolute top-2 right-2 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <MicOff size={16} aria-hidden />
        {t.room.muteShort}
      </Button>
    </div>
  );
}

// Desktop, 1024 px and wider: the other person on top, you below, 4:3.
export function CameraColumn({ width, onMute }: { width: number; onMute?: OnMute }) {
  const t = useT();
  const { other, self } = useCameras();
  return (
    <div
      aria-label={t.room.cameras}
      className="flex min-w-0 shrink-0 flex-col gap-2"
      style={{ width }}
      data-testid="camera-column"
    >
      {/* Review B4: the other person big; your own camera smaller, under it on the right
          (full width while you're alone). */}
      {[other, self].map(
        (cam) =>
          cam && (
            <div
              key={cam.participant.identity}
              data-testid={cam === self ? "self-camera" : undefined}
              className={cam === self && other ? "w-[62%] self-end" : undefined}
              style={{ aspectRatio: "4 / 3" }}
            >
              <CameraTile trackRef={cam} onMute={onMute} />
            </div>
          ),
      )}
    </div>
  );
}


// Just talk on a tablet-sized window: the other person fills the room, your own camera
// floats small and can be dragged to any corner.
export function SpotlightCameras({ onMute }: { onMute?: OnMute }) {
  const t = useT();
  const { other, self } = useCameras();
  const main = other ?? self;
  return (
    <div data-testid="spotlight" className="relative min-h-0 flex-1 overflow-hidden rounded-panel bg-video">
      {main && <CameraTile trackRef={main} onMute={onMute} />}
      {other && self && (
        <Floating
          storageKey="room-spotlight-self-corner"
          label={t.room.yourCamera}
          testId="spotlight-self"
          className="w-[22%] max-w-60 min-w-36 overflow-hidden rounded-md border-2 border-surface shadow-soft"
        >
          <div className="pointer-events-none" style={{ aspectRatio: "16 / 9" }}>
            <Tile trackRef={self} small />
          </div>
        </Floating>
      )}
    </div>
  );
}

// Phones: both cameras in a row, 16:9, filling the width.
// 768–1023 px (`height` set): the same row above the stage, each tile that tall, centred
// (tester feedback: no floating cameras; jump straight from the column to the row).
export function CameraRow({ height, onMute }: { height?: number; onMute?: OnMute }) {
  const t = useT();
  const { other, self } = useCameras();
  const cams = [other, self].filter((c): c is TrackReferenceOrPlaceholder => Boolean(c));
  if (height) {
    return (
      <div aria-label={t.room.cameras} data-testid="camera-row" className="flex shrink-0 justify-center gap-2">
        {cams.map((cam) => (
          <div key={cam.participant.identity} style={{ height, aspectRatio: "16 / 9" }}>
            <CameraTile trackRef={cam} onMute={onMute} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2">
      {cams.map((cam) => (
        <div key={cam.participant.identity} style={{ aspectRatio: "16 / 9" }}>
          <Tile trackRef={cam} small />
        </div>
      ))}
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
