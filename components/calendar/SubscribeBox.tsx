"use client";

import { CalendarPlus, Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { calendarFeedToken } from "@/app/(app)/dashboard/calendar/actions";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useT } from "@/lib/i18n/client";

// "Add to Google / Apple calendar": a private subscription link (/api/calendar/<token>.ics),
// made on first use. Google, Apple and Outlook fetch it themselves and keep it up to date.
export default function SubscribeBox() {
  const t = useT().calendar;
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const load = (renew = false) =>
    start(async () => {
      setFailed(false);
      const token = await calendarFeedToken(renew);
      if (!token) return setFailed(true);
      setUrl(`${window.location.origin}/api/calendar/${token}.ics`);
    });
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!url)
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button type="button" onClick={() => load()} disabled={pending} className={buttonClass("secondary", "md", "h-11 gap-2 px-4 font-semibold")}>
          <CalendarPlus size={17} aria-hidden />
          {t.subscribe}
        </button>
        {failed && (
          <p role="alert" className="text-sm text-danger">
            {t.failed}
          </p>
        )}
      </div>
    );

  return (
    <section aria-labelledby="subscribe-title" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <h2 id="subscribe-title" className="flex items-center gap-2 text-[18px] font-semibold">
        <CalendarPlus size={18} aria-hidden className="text-accent" />
        {t.subscribeTitle}
      </h2>
      <p className="max-w-[640px] text-sm text-ink-muted">{t.subscribeText}</p>
      <div className="flex gap-2">
        <input readOnly value={url} aria-label={t.subscribeTitle} onFocus={(e) => e.currentTarget.select()} className={`${inputClass()} min-w-0 flex-1 text-sm`} />
        <button type="button" onClick={copy} className={buttonClass("primary", "md", "h-10 gap-1.5 px-4 font-semibold")}>
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <ul className="flex flex-col gap-1 text-sm text-ink-muted">
        <li>{t.subscribeGoogle}</li>
        <li>{t.subscribeApple}</li>
        <li>{t.subscribeOutlook}</li>
      </ul>
      <button type="button" onClick={() => load(true)} disabled={pending} className="self-start text-sm text-ink-muted hover:text-danger hover:underline">
        {t.newFeedLink}
      </button>
    </section>
  );
}
