import { Check, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import Wordmark from "@/components/ui/Wordmark";

// The one layout for login, sign-up, forgot password, check your email, new password and link
// expired (docs/design/HANDOFF.md, "Sign in"; screen Auth): the form on the left, a short
// explanation of TeachingTime on the right from 768 px; on phones the form only, near the top
// so the keyboard doesn't cover it.
export default function AuthCard({
  title,
  intro,
  icon,
  children,
}: {
  title: string;
  intro?: ReactNode;
  icon?: ReactNode; // a round surface-2 icon above the title (check email, link expired)
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-wrap bg-paper">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col px-[clamp(16px,5vw,64px)] py-7">
        <Wordmark underline="draw" />
        <main className="flex flex-1 items-start justify-center pt-9 pb-6 md:items-center md:py-12">
          <div className="flex w-full max-w-[380px] flex-col gap-6">
            {icon && (
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-accent">
                {icon}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] leading-[1.1] tracking-[-0.02em] md:text-[34px]">{title}</h1>
              {intro && <div className="leading-normal text-ink-muted">{intro}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
      <BrandPanel />
    </div>
  );
}

// The right-hand panel: what TeachingTime is, a small drawing of the room, three points.
function BrandPanel() {
  const points = [
    "Both cameras stay visible while you share your screen",
    "Notes and drawings update instantly for both of you",
    "You decide when your student can write and draw",
  ];
  return (
    <aside className="hidden min-w-0 flex-[1_1_560px] flex-col justify-center gap-9 border-l border-line bg-surface-2 px-[clamp(24px,5vw,80px)] py-16 md:flex">
      <div className="flex max-w-[520px] flex-col gap-3.5">
        <h2 className="font-display text-[44px] leading-[1.08] font-extrabold tracking-[-0.02em]">
          Every lesson in one calm room.
        </h2>
        <p className="text-lg leading-normal text-ink-muted">
          Video, screen sharing, a shared notebook and a whiteboard. Your student joins with a link, no
          account needed.
        </p>
      </div>
      <RoomDrawing />
      <ul className="flex max-w-[520px] flex-col gap-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5">
            <Check size={18} strokeWidth={2.5} aria-hidden className="mt-0.5 shrink-0 text-ok" />
            {p}
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Decorative: two cameras and two tabs, the left one active (marker underline, accent outline).
// Also the start page's picture (app/page.tsx).
export function RoomDrawing() {
  return (
    <div
      aria-hidden
      className="flex aspect-[16/10] w-full max-w-[520px] gap-2 rounded-panel border border-line bg-paper p-2.5 shadow-soft"
    >
      <div className="flex basis-[26%] flex-col gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex aspect-[4/3] items-center justify-center rounded-md bg-video">
            <span className="h-6 w-6 rounded-full bg-ink-muted" />
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex h-7 items-end gap-1 border-b border-line bg-surface-2 px-2">
          <div className="relative -mb-px h-[22px] w-[72px] rounded-t-[5px] border border-line border-b-surface bg-surface">
            <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="absolute bottom-[3px] left-3 h-1.5 w-11">
              <path d="M2 4 C 30 1, 60 5, 98 3" fill="none" stroke="var(--color-marker)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="-mb-px h-[22px] w-16 rounded-t-[5px] border border-line border-b-surface bg-surface" />
        </div>
        <div className="flex flex-1 gap-2 bg-paper p-2">
          <div className="flex flex-1 flex-col gap-1.5 rounded-md border-2 border-accent bg-surface p-2.5">
            <div className="h-2 w-3/5 rounded bg-ink" />
            <div className="h-1.5 w-[90%] rounded bg-line" />
            <div className="h-1.5 w-4/5 rounded bg-line" />
            <div className="h-1.5 w-[85%] rounded bg-line" />
          </div>
          <div className="flex flex-1 items-center justify-center rounded-md border-2 border-line bg-surface">
            <svg width="80" height="50" viewBox="0 0 80 50">
              <ellipse cx="40" cy="25" rx="30" ry="15" fill="none" stroke="var(--color-marker)" strokeWidth="4" transform="rotate(-5 40 25)" />
              <path d="M24 26 L 56 24" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// An error above the form's button: danger-soft banner with an icon.
export function FormError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md bg-danger-soft px-3 py-2.5 text-sm leading-snug text-danger">
      <CircleAlert size={16} aria-hidden className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Text link under a form ("Create a teacher account", "Back to login").
export const textLink =
  "rounded-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// The big button of each form: 44 px, full width.
export const submitClass = "h-11 w-full font-semibold";
