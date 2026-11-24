"use client";

import { Check, Cloud, Download, Unplug } from "lucide-react";
import { type ReactNode, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { disconnectDropbox, startDropboxConnect } from "@/lib/cloud/dropbox";
import { connectGoogle, disconnectGoogle } from "@/lib/cloud/google";
import { DROPBOX_CONFIGURED, GOOGLE_CONFIGURED, type SaveTo, useCloud, writeCloud } from "@/lib/cloud/store";
import { useT } from "@/lib/i18n/client";

// C1: Settings › Connected clouds, and where recordings go.
export default function CloudSettings() {
  const t = useT().cloud;
  const cloud = useCloud();
  const [busy, setBusy] = useState<"google" | "dropbox" | null>(null);
  const [error, setError] = useState("");

  const connect = async (which: "google" | "dropbox") => {
    setError("");
    setBusy(which);
    try {
      if (which === "google") await connectGoogle();
      else await startDropboxConnect("/dashboard/settings"); // leaves the page
    } catch (e) {
      console.error(which, e);
      setError(t.connectFailed);
    } finally {
      if (which === "google") setBusy(null);
    }
  };

  const options: { id: SaveTo; label: string; icon: ReactNode; ok: boolean }[] = [
    { id: "download", label: t.saveDownload, icon: <Download size={18} aria-hidden />, ok: true },
    ...(GOOGLE_CONFIGURED ? [{ id: "google" as const, label: t.saveGoogle, icon: <Cloud size={18} aria-hidden />, ok: !!cloud.google }] : []),
    ...(DROPBOX_CONFIGURED ? [{ id: "dropbox" as const, label: t.saveDropbox, icon: <Cloud size={18} aria-hidden />, ok: !!cloud.dropbox }] : []),
  ];

  return (
    <>
      <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-[-0.02em]">{t.settingsTitle}</h1>
      <section aria-labelledby="clouds" className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5">
        <div className="flex flex-col gap-1">
          <h2 id="clouds" className="text-[18px] font-semibold">
            {t.clouds}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">{t.cloudsIntro}</p>
        </div>
        <ul className="flex flex-col">
          {GOOGLE_CONFIGURED && (
            <CloudRow
              name={t.google}
              mark={<GoogleDriveMark />}
              status={cloud.google ? (cloud.google.email ? t.connectedAs(cloud.google.email) : t.connected) : t.notConnected}
              where={t.googleSaves}
              connected={!!cloud.google}
              busy={busy === "google"}
              onConnect={() => connect("google")}
              onDisconnect={() => void disconnectGoogle()}
            />
          )}
          {DROPBOX_CONFIGURED && (
            <CloudRow
              name={t.dropbox}
              mark={<DropboxMark />}
              status={cloud.dropbox ? (cloud.dropbox.email ? t.connectedAs(cloud.dropbox.email) : t.connected) : t.notConnected}
              where={t.dropboxSaves}
              connected={!!cloud.dropbox}
              busy={busy === "dropbox"}
              onConnect={() => connect("dropbox")}
              onDisconnect={() => void disconnectDropbox()}
            />
          )}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <section aria-labelledby="after-recording" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
        <h2 id="after-recording" className="text-[18px] font-semibold">
          {t.afterRecording}
        </h2>
        <div role="radiogroup" aria-labelledby="after-recording" className="flex flex-col gap-1">
          {options.map((o) => (
            <label
              key={o.id}
              className={`flex min-h-12 items-center gap-3 rounded-md px-2 ${o.ok ? "cursor-pointer hover:bg-surface-2" : "opacity-55"}`}
            >
              <input
                type="radio"
                name="save-to"
                checked={cloud.saveTo === o.id}
                disabled={!o.ok}
                onChange={() => writeCloud({ saveTo: o.id })}
                className="h-[18px] w-[18px] accent-[var(--color-accent)]"
              />
              <span className="text-ink-muted">{o.icon}</span>
              <span className="flex flex-col">
                <span className="text-[15px] font-medium">{o.label}</span>
                {!o.ok && <span className="text-[13px] text-ink-muted">{t.connectFirst}</span>}
              </span>
            </label>
          ))}
        </div>
      </section>
      <p className="px-1 text-[13px] text-ink-muted">{t.thisDevice}</p>
    </>
  );
}

function CloudRow({
  name,
  mark,
  status,
  where,
  connected,
  busy,
  onConnect,
  onDisconnect,
}: {
  name: string;
  mark: ReactNode;
  status: string;
  where: string;
  connected: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const t = useT().cloud;
  return (
    <li aria-label={name} className="flex flex-wrap items-center gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2">{mark}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{name}</span>
        <span className={`flex items-center gap-1 text-[13px] ${connected ? "text-ok" : "text-ink-muted"}`}>
          {connected && <Check size={13} aria-hidden />}
          {status}
        </span>
        {connected && <span className="text-[13px] text-ink-muted">{where}</span>}
      </span>
      {connected ? (
        <button type="button" onClick={onDisconnect} className={buttonClass("ghost", "md", "h-10 px-3")}>
          <Unplug size={16} aria-hidden />
          {t.disconnect}
        </button>
      ) : (
        <button type="button" onClick={onConnect} disabled={busy} className={buttonClass("secondary", "md", "h-10 px-4 font-semibold")}>
          {busy ? t.connecting : t.connect}
        </button>
      )}
    </li>
  );
}

// Simple marks in the services' colours (not their logos).
export function GoogleDriveMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M8.2 3h7.6l6.2 10.6-3.8 6.4H5.8L2 13.6z" fill="none" />
      <path d="M8.2 3 2 13.6l3.8 6.4L12 9.4z" fill="#0F9D58" />
      <path d="M15.8 3H8.2L12 9.4h10z" fill="#FFC107" transform="translate(0 0)" />
      <path d="M22 13.6H9.6L5.8 20h12.4z" fill="#4285F4" />
    </svg>
  );
}
export function DropboxMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="#0061FF">
      <path d="m7 3-5 3.2 5 3.2 5-3.2zm10 0-5 3.2 5 3.2 5-3.2zM2 12.6l5 3.2 5-3.2-5-3.2zm15-3.2-5 3.2 5 3.2 5-3.2zM7 17l5 3.2 5-3.2-5-3.2z" />
    </svg>
  );
}
