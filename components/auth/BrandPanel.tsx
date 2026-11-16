"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

// AuthCard's right-hand panel: what TeachingTime is, a small drawing of the room, three points.
// A client component so it reads the page's language (AuthCard is also used by server pages).
// `drawing`: AuthCard's RoomDrawing (passed in, so the two files don't import each other).
export default function BrandPanel({ drawing }: { drawing: ReactNode }) {
  const t = useT();
  return (
    <aside className="hidden min-w-0 flex-[1_1_560px] flex-col justify-center gap-9 border-l border-line bg-surface-2 px-[clamp(24px,5vw,80px)] py-16 md:flex">
      <div className="flex max-w-[520px] flex-col gap-3.5">
        <h2 className="font-display text-[44px] leading-[1.08] font-extrabold tracking-[-0.02em]">
          {t.auth.brandTitle}
        </h2>
        <p className="text-lg leading-normal text-ink-muted">{t.auth.brandText}</p>
      </div>
      {drawing}
      <ul className="flex max-w-[520px] flex-col gap-3">
        {t.auth.brandPoints.map((p) => (
          <li key={p} className="flex items-start gap-2.5">
            <Check size={18} strokeWidth={2.5} aria-hidden className="mt-0.5 shrink-0 text-ok" />
            {p}
          </li>
        ))}
      </ul>
    </aside>
  );
}
