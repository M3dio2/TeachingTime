"use client";

import { useConnectionQualityIndicator, useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { ConnectionQuality, type LocalParticipant, type Participant, Track, VideoQuality } from "livekit-client";
import { Signal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

// Asia (review A11): long, lossy routes (China, mobile data) make video stutter. When my own
// connection stays poor, my camera goes out in its lowest copy only (180p), so the sound keeps
// room; when it's good again for a while, back to normal. A note says so, with "Turn off my
// camera" for really bad cases. The teacher also hears when the student's connection is weak.
const POOR_AFTER_MS = 6_000;
const GOOD_AFTER_MS = 20_000;

function useLasting(on: boolean, ms: number) {
  const [lasting, setLasting] = useState(false);
  useEffect(() => {
    if (!on) {
      const reset = setTimeout(() => setLasting(false), 0);
      return () => clearTimeout(reset);
    }
    const timer = setTimeout(() => setLasting(true), ms);
    return () => clearTimeout(timer);
  }, [on, ms]);
  return on && lasting;
}

export default function WeakConnection() {
  const { localParticipant } = useLocalParticipant();
  const other = useRemoteParticipants()[0];
  return (
    <>
      <MyConnection participant={localParticipant} />
      {other && <OtherConnection participant={other} />}
    </>
  );
}

function MyConnection({ participant }: { participant: LocalParticipant }) {
  const t = useT().net;
  const { quality } = useConnectionQualityIndicator({ participant });
  const poor = useLasting(quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost, POOR_AFTER_MS);
  const good = useLasting(quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good, GOOD_AFTER_MS);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Adjusted while rendering: poor → save, good for a while → normal again.
  if (poor && !saving) setSaving(true);
  if (good && saving) {
    setSaving(false);
    setDismissed(false);
  }

  useEffect(() => {
    const camera = participant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    camera?.setPublishingQuality(saving ? VideoQuality.LOW : VideoQuality.HIGH);
  }, [saving, participant, quality]);

  if (!saving || dismissed) return null;
  const cameraOn = participant.isCameraEnabled;
  return (
    <Note testId="weak-connection" onClose={() => setDismissed(true)}>
      <span>{t.weakMine}</span>
      {cameraOn && (
        <button
          type="button"
          onClick={() => void participant.setCameraEnabled(false)}
          className="h-9 shrink-0 rounded-md bg-white/15 px-3 font-semibold hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          {t.cameraOff}
        </button>
      )}
    </Note>
  );
}

function OtherConnection({ participant }: { participant: Participant }) {
  const t = useT().net;
  const { quality } = useConnectionQualityIndicator({ participant });
  const poor = useLasting(quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost, POOR_AFTER_MS);
  const [dismissed, setDismissed] = useState(false);
  if (!poor || dismissed) return null;
  return (
    <Note testId="weak-connection-other" onClose={() => setDismissed(true)} second>
      <span>{t.weakOther(participant.name || t.theOther)}</span>
    </Note>
  );
}

function Note({ children, onClose, testId, second = false }: { children: React.ReactNode; onClose: () => void; testId: string; second?: boolean }) {
  const t = useT();
  return (
    <div
      role="status"
      data-testid={testId}
      className={`fixed left-1/2 z-40 flex w-[min(560px,calc(100vw-16px))] -translate-x-1/2 items-center gap-3 rounded-panel bg-video px-4 py-2.5 text-sm text-white shadow-soft ${
        second ? "top-20" : "top-3"
      }`}
    >
      <Signal size={18} aria-hidden className="shrink-0 text-marker" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.common.close}
        className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
