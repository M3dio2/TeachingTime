"use client";

import { VideoOff } from "lucide-react";
import type { CSSProperties } from "react";
import { DEMO_STUDENT } from "@/lib/demo/content";
import { useT } from "@/lib/i18n/client";
import { useDemo } from "./DemoContext";

// The demo's two "cameras": Lucía drawn (she blinks, and talks in speech bubbles), and the
// visitor's own tile with the camera off (the demo never asks for camera or microphone).
export function LuciaTile({ style, small = false }: { style?: CSSProperties; small?: boolean }) {
  const demo = useDemo();
  const t = useT().demo;
  const here = demo?.here ?? false;
  return (
    <div
      data-testid="demo-student-camera"
      className="relative h-full w-full overflow-hidden rounded-md bg-[#f3dcc4]"
      style={style}
      aria-label={t.studentCamera(DEMO_STUDENT)}
      role="img"
    >
      {here ? (
        <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <rect width="160" height="120" fill="#e9cfb3" />
          <rect x="108" y="14" width="34" height="44" rx="3" fill="#cfe0c3" stroke="#b49a7e" strokeWidth="2" />
          <path d="M112 50 l10 -14 l8 9 l6 -6 l6 11z" fill="#8fb07a" />
          <path d="M20 22 h40 v6 h-40z" fill="#c7a585" />
          <rect x="24" y="8" width="8" height="14" fill="#7c5ea8" />
          <rect x="34" y="11" width="7" height="11" fill="#d9734a" />
          <rect x="43" y="6" width="9" height="16" fill="#4f7a8c" />
          {/* shoulders */}
          <path d="M38 120 C 42 92 62 84 80 84 C 98 84 118 92 122 120 Z" fill="#3f6e8c" />
          <path d="M70 84 L80 96 L90 84 Z" fill="#f2c9a5" />
          {/* hair back */}
          <path d="M52 62 C 46 30 62 18 80 18 C 100 18 114 30 108 64 C 106 76 100 84 96 86 L64 86 C 58 82 54 74 52 62Z" fill="#2e1f1a" />
          {/* neck + face */}
          <rect x="72" y="70" width="16" height="16" rx="6" fill="#c98f6b" />
          <ellipse cx="80" cy="54" rx="20" ry="24" fill="#d9a07a" />
          {/* fringe */}
          <path d="M60 50 C 60 30 72 26 82 28 C 92 30 100 36 100 50 C 92 40 80 38 70 42 C 66 44 62 48 60 50Z" fill="#2e1f1a" />
          {/* eyes (blink) */}
          <g className="demo-blink">
            <ellipse cx="72" cy="55" rx="2.6" ry="3" fill="#2a1a14" />
            <ellipse cx="88" cy="55" rx="2.6" ry="3" fill="#2a1a14" />
          </g>
          <path d="M67 49 q5 -3 9 0 M84 49 q5 -3 9 0" stroke="#2e1f1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <ellipse cx="68" cy="63" rx="4" ry="2.4" fill="#e78f7a" opacity="0.45" />
          <ellipse cx="92" cy="63" rx="4" ry="2.4" fill="#e78f7a" opacity="0.45" />
          {/* mouth: open while she talks */}
          {demo?.caption ? (
            <ellipse className="demo-talk" cx="80" cy="67" rx="4.5" ry="3" fill="#8a3b33" />
          ) : (
            <path d="M74 66 q6 5 12 0" stroke="#8a3b33" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          {/* earrings */}
          <circle cx="60" cy="62" r="1.8" fill="#f6c453" />
          <circle cx="100" cy="62" r="1.8" fill="#f6c453" />
        </svg>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">{t.studentJoining(DEMO_STUDENT)}</div>
      )}
      {here && demo?.caption && (
        // Big tile: above her head. Small tiles (phones): over her shoulders, so her face shows.
        <div
          role="status"
          data-testid="demo-caption"
          className={`absolute right-1.5 left-1.5 rounded-xl bg-surface/95 font-medium text-ink shadow-soft ${
            small ? "bottom-1.5 line-clamp-2 px-2 py-1 text-[11px] leading-tight" : "top-2 px-2.5 py-1.5 text-[13px] leading-snug"
          }`}
        >
          {demo.caption}
        </div>
      )}
      {!(small && demo?.caption) && (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-video/70 px-1.5 py-0.5 text-[12px] font-medium text-white">
          {DEMO_STUDENT}
        </span>
      )}
    </div>
  );
}

export function SelfDemoTile({ style, small = false }: { style?: CSSProperties; small?: boolean }) {
  const t = useT().demo;
  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden rounded-md bg-video pb-5 text-white/80"
      style={style}
      title={t.cameraOff}
    >
      <div className="flex flex-col items-center gap-1 px-2 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-display text-base font-bold">{t.youInitial}</span>
        {!small && (
          <span className="flex items-center gap-1 text-[12px] leading-tight">
            <VideoOff size={13} aria-hidden className="shrink-0" />
            {t.cameraOff}
          </span>
        )}
      </div>
      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/40 px-1.5 py-0.5 text-[12px] font-medium">{t.you}</span>
    </div>
  );
}
