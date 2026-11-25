"use client";

import { BellRing, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";

// Review A2: a student who is waiting shouldn't be missed. When someone new arrives: a soft
// chime, "(1) Anna is waiting" in the tab title, and a browser notification if the teacher
// allowed it and is looking at another tab. The dashboard refreshes every 10 s (AutoRefresh).
export type Waiting = { id: string; name: string };
const SEEN_KEY = "tt-waiting-seen";
const ASKED_KEY = "tt-notify-asked";

function chime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [660, 880].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = f;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, now + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.55);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {}
}

const permission = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
const noop = () => () => {};

export default function WaitingAlert({ waiting }: { waiting: Waiting[] }) {
  const t = useT().dashboard;
  const key = waiting.map((w) => w.id).join(",");
  const base = useRef<string | null>(null);
  const router = useRouter();

  // The tab title, while anyone waits.
  useEffect(() => {
    base.current ??= document.title.replace(/^\(\d+\) [^·]*· /, "");
    document.title = waiting.length ? `(${waiting.length}) ${t.isWaitingTitle(waiting[0].name)} · ${base.current}` : base.current;
  });
  useEffect(() => () => void (base.current && (document.title = base.current)), []);

  // Someone new: chime and notification (once per arrival, also across refreshes).
  useEffect(() => {
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    } catch {}
    const fresh = waiting.filter((w) => !seen.includes(w.id));
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(waiting.map((w) => w.id)));
    if (!fresh.length) return;
    chime();
    if (permission() === "granted" && document.visibilityState !== "visible") {
      const n = new Notification(t.isWaitingTitle(fresh[0].name), { body: t.isWaitingBody, tag: `waiting-${fresh[0].id}` });
      n.onclick = () => {
        window.focus();
        router.push(`/lesson/${fresh[0].id}`);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, router]);

  return <NotifyOffer />;
}

// "Get a notification when a student is waiting": asked once, never by itself.
function NotifyOffer() {
  const t = useT().dashboard;
  const state = useSyncExternalStore(noop, permission, () => "unsupported");
  const asked = useSyncExternalStore(noop, () => localStorage.getItem(ASKED_KEY) === "1", () => true);
  const [hidden, setHidden] = useState(false);
  if (state !== "default" || asked || hidden) return null;
  const done = () => {
    localStorage.setItem(ASKED_KEY, "1");
    setHidden(true);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-line bg-surface px-4 py-3 text-sm">
      <BellRing size={18} aria-hidden className="shrink-0 text-accent" />
      <span className="min-w-0 flex-[1_1_240px]">{t.notifyOffer}</span>
      <button
        type="button"
        onClick={() => void Notification.requestPermission().finally(done)}
        className="inline-flex h-9 items-center rounded-md bg-ink px-3 font-semibold text-surface hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {t.notifyTurnOn}
      </button>
      <button
        type="button"
        aria-label={t.notifyNotNow}
        title={t.notifyNotNow}
        onClick={done}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
