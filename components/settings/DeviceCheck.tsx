"use client";

import { Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { CameraPreview, useCameraCheck } from "@/components/room/CameraCheck";
import { buttonClass } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

// Review A3: the teacher checks camera and microphone before a lesson (students already get
// this on the join page). Off until she asks, so the camera light doesn't come on by itself.
export default function DeviceCheck() {
  const t = useT().cloud;
  const [on, setOn] = useState(false);
  return (
    <section aria-labelledby="device-check" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 id="device-check" className="text-[18px] font-semibold">
          {t.deviceCheck}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">{t.deviceCheckIntro}</p>
      </div>
      {on ? (
        <Running onStop={() => setOn(false)} />
      ) : (
        <button type="button" onClick={() => setOn(true)} className={buttonClass("secondary", "md", "h-11 self-start px-4 font-semibold")}>
          {t.startCheck}
        </button>
      )}
    </section>
  );
}

function Running({ onStop }: { onStop: () => void }) {
  const t = useT().cloud;
  const check = useCameraCheck();
  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-[420px]">
        <CameraPreview check={check} />
      </div>
      <MicMeter track={check.micOn ? (check.tracks?.audio?.mediaStreamTrack ?? null) : null} />
      <button type="button" onClick={onStop} className={buttonClass("ghost", "md", "h-10 self-start px-3")}>
        {t.stopCheck}
      </button>
    </div>
  );
}

// A bar that moves with the voice: "they'll hear you".
function MicMeter({ track }: { track: MediaStreamTrack | null }) {
  const t = useT().cloud;
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!track) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
    };
  }, [track]);
  const shown = track ? level : 0;
  return (
    <div className="flex max-w-[420px] items-center gap-3">
      <Mic size={18} aria-hidden className="shrink-0 text-ink-muted" />
      <div
        role="meter"
        aria-label={t.micLevel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shown * 100)}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-ok transition-[width] duration-75" style={{ width: `${Math.round(shown * 100)}%` }} />
      </div>
      <span className="w-32 shrink-0 text-[13px] text-ink-muted">{shown > 0.08 ? t.micHeard : t.micSaySomething}</span>
    </div>
  );
}
