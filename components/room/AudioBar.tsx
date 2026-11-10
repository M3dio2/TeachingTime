"use client";

import { Music, Pause, Play, X } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { audioPosition, formatTime } from "@/lib/room/audio";
import type { RoomModel } from "./roomModel";

// Re-render a few times a second while something plays.
function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [active]);
}

// A1: the audio bar above the tabs, for both (docs/design/screens/Main.dc.html). Teacher:
// play/pause, title, progress with the yellow playhead (click or drag to seek, arrow keys ±5 s),
// time, stop. Student: a music icon, title, progress and time; her bar runs on its own from the
// teacher's attributes.
export default function AudioBar({ model, phone = false }: { model: RoomModel; phone?: boolean }) {
  const audio = model.view.audio;
  const controls = model.audio;
  const playing = Boolean(audio && audio.pausedAt === null);
  useTicker(playing);
  const track = useRef<HTMLDivElement>(null);
  if (!audio) return null;

  const pos = audioPosition(audio);
  const pct = audio.duration ? (pos / audio.duration) * 100 : 0;
  const teacher = Boolean(controls);

  const seekTo = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || !controls) return;
    controls.seek(((clientX - r.left) / r.width) * audio.duration);
  };
  const startSeek = (e: PointerEvent<HTMLDivElement>) => {
    if (!controls || e.button !== 0) return;
    seekTo(e.clientX);
    const move = (ev: globalThis.PointerEvent) => seekTo(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === "ArrowRight" ? 5 : e.key === "ArrowLeft" ? -5 : 0;
    if (!d || !controls) return;
    e.preventDefault();
    controls.seek(pos + d);
  };

  return (
    <div
      data-testid="audio-bar"
      className={`flex h-11 shrink-0 items-center gap-3 border-b border-line px-3 ${phone ? "bg-surface-2" : "bg-surface"}`}
    >
      {teacher ? (
        <button
          type="button"
          aria-label={playing ? "Pause the audio" : "Play the audio"}
          title={playing ? "Pause the audio" : "Play the audio"}
          onClick={() => (playing ? controls?.pause() : controls?.play({ id: audio.id, name: audio.name }))}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {playing ? <Pause size={12} fill="currentColor" aria-hidden /> : <Play size={12} fill="currentColor" aria-hidden />}
        </button>
      ) : (
        <Music size={16} aria-hidden className="shrink-0 text-ink-muted" />
      )}
      <span className={`min-w-0 truncate text-sm font-medium ${phone ? "max-w-[40%]" : "max-w-72"}`}>{audio.name}</span>
      <div
        ref={track}
        role="slider"
        tabIndex={teacher ? 0 : -1}
        aria-label="Audio position"
        aria-valuemin={0}
        aria-valuemax={Math.round(audio.duration)}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${formatTime(pos)} of ${formatTime(audio.duration)}`}
        aria-readonly={!teacher}
        onPointerDown={startSeek}
        onKeyDown={key}
        className={`relative h-4 min-w-10 flex-1 touch-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          teacher ? "cursor-pointer" : ""
        }`}
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        {/* The playhead: the marker's one other use (docs/design/HANDOFF.md). */}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-marker"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[13px] whitespace-nowrap text-ink-muted tabular-nums">
        {formatTime(pos)}
        {!phone || !teacher ? ` / ${formatTime(audio.duration)}` : ""}
      </span>
      {teacher && (
        <button
          type="button"
          aria-label="Stop the audio"
          title="Stop the audio"
          onClick={() => controls?.stop()}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
