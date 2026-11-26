"use client";

import { Check, Copy, ExternalLink, TriangleAlert } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";
import { detectInAppBrowser, type InAppBrowser } from "@/lib/inAppBrowser";

// Asia: on the join page, when the link was opened inside a chat app (lib/inAppBrowser.ts).
const noop = () => () => {};
const read = () => {
  const found = detectInAppBrowser(navigator.userAgent, window.location.href);
  return found ? JSON.stringify(found) : "";
};

export default function InAppNotice() {
  const t = useT().net;
  const raw = useSyncExternalStore(noop, read, () => "");
  const [copied, setCopied] = useState(false);
  if (!raw) return null;
  const inApp = JSON.parse(raw) as InAppBrowser;
  const link = typeof window === "undefined" ? "" : window.location.href.replace(/[?&]openExternalBrowser=1/, "");
  const how = inApp.os === "ios" ? t.inAppHowIos(inApp.app) : inApp.os === "android" ? t.inAppHowAndroid(inApp.app) : t.inAppHowOther;
  return (
    <div role="alert" data-testid="in-app-notice" className="flex flex-col gap-3 rounded-panel border border-marker bg-marker-soft p-4 text-marker-ink">
      <p className="flex items-start gap-2 font-semibold">
        <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
        {t.inAppTitle(inApp.app)}
      </p>
      <p className="text-[15px] leading-relaxed">{how}</p>
      <div className="flex flex-wrap gap-2">
        {inApp.openUrl && (
          <a
            href={inApp.openUrl}
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-ink px-4 text-[15px] font-semibold text-surface hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <ExternalLink size={16} aria-hidden />
            {t.inAppOpen}
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex h-11 items-center gap-1.5 rounded-md border border-marker-ink/30 bg-surface px-4 text-[15px] font-medium text-ink hover:bg-paper focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {copied ? <Check size={16} aria-hidden className="text-ok" /> : <Copy size={16} aria-hidden />}
          {copied ? t.copied : t.copyLink}
        </button>
      </div>
    </div>
  );
}
