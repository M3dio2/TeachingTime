"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, the check against sign-up bots (G1). Supabase checks the token itself
// (Authentication → Attack Protection → CAPTCHA), so skipping the form doesn't skip it.
// Off until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set: then the forms work exactly as before.
// Most people never see a puzzle; the widget shows a small "Verifying…" box and ticks itself.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<void> | null = null;
function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile didn't load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// `token`: undefined while CAPTCHA is off (forms send nothing), null until solved.
// `reset()` after each try: a token works once.
export function useCaptcha() {
  // A callback ref (state), so the box can be handed to <CaptchaBox> during render.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string | null | undefined>(SITE_KEY ? null : undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !box) return;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !window.turnstile) return;
        widget.current = window.turnstile.render(box, {
          sitekey: SITE_KEY,
          size: "flexible",
          theme: "light",
          callback: (t: string) => {
            setToken(t);
            setFailed(false);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      gone = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [box]);

  const reset = useCallback(() => {
    if (!SITE_KEY) return;
    setToken(null);
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return { token, reset, box: { enabled: Boolean(SITE_KEY), failed, setBox } };
}

// Usage: <CaptchaBox {...captcha.box} />
export function CaptchaBox({
  enabled,
  failed,
  setBox,
}: {
  enabled: boolean;
  failed: boolean;
  setBox: (el: HTMLDivElement | null) => void;
}) {
  if (!enabled) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div ref={setBox} data-testid="captcha" className="min-h-[65px]" />
      {failed && (
        <p className="text-sm text-danger">
          The check that you&apos;re not a robot didn&apos;t load. Reload the page, or try another browser.
        </p>
      )}
    </div>
  );
}

// The submit button's label while the check is still running.
export const CAPTCHA_WAIT = "Checking you're not a robot…";
