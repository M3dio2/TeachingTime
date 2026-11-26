"use client";

import { Gauge, Loader2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { type Verdict, verdictOf } from "@/lib/inAppBrowser";

// Asia: "Test my connection" on the join page. LiveKit's own checks against the video servers
// (connection, then a 7-second video test over UDP and TCP) give delay, lost packets and upload
// speed; we turn that into one plain verdict. The result is also sent to us (country only, no
// name), so we learn how lessons from China, Thailand… actually run.

export default function ConnectionTest() {
  const t = useT().net;
  const [state, setState] = useState<"idle" | "running" | Verdict>("idle");
  const [detail, setDetail] = useState("");

  const run = async () => {
    setState("running");
    let verdict: Verdict = "blocked";
    let summary = "";
    try {
      const res = await fetch("/api/connection-test", { method: "POST" });
      if (!res.ok) throw new Error(`token ${res.status}`);
      const { token } = await res.json();
      const { ConnectionCheck } = await import("livekit-client");
      const check = new ConnectionCheck(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
      const ws = await check.checkWebsocket();
      const rtc = ws.status === 3 ? await check.checkWebRTC() : ws;
      if (rtc.status === 3) {
        const proto = await check.checkConnectionProtocol();
        const d = proto.data as
          | { protocol: string; packetsLost: number; packetsSent: number; rttTotal: number; bitrateTotal: number; count: number }
          | undefined;
        if (d && d.count) {
          const stats = {
            rttMs: Math.round((d.rttTotal / d.count) * 1000),
            lossPct: d.packetsSent ? Math.round((d.packetsLost / d.packetsSent) * 1000) / 10 : 0,
            upMbps: Math.round((d.bitrateTotal / d.count / 1e6) * 100) / 100,
          };
          verdict = verdictOf(stats);
          summary = `${verdict} ${d.protocol} rtt=${stats.rttMs}ms loss=${stats.lossPct}% up=${stats.upMbps}Mbps`;
          setDetail(t.detail(stats.rttMs, stats.lossPct, stats.upMbps));
        } else {
          verdict = "ok";
          summary = "ok (no stats)";
        }
      } else {
        summary = `blocked ws=${ws.status} rtc=${rtc.status}`;
      }
    } catch (e) {
      summary = `blocked ${e instanceof Error ? e.message : "error"}`.slice(0, 200);
    }
    setState(verdict);
    void fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "connection-test", message: summary, digest: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop" }),
    }).catch(() => {});
  };

  const tone =
    state === "good" ? "text-ok" : state === "ok" ? "text-ink" : state === "weak" || state === "blocked" ? "text-danger" : "text-ink-muted";
  return (
    <div className="flex flex-col items-center gap-1.5 text-center" data-testid="connection-test" data-result={state}>
      {state === "idle" ? (
        <button
          type="button"
          onClick={run}
          className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] font-medium text-accent underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <Gauge size={15} aria-hidden />
          {t.testConnection}
        </button>
      ) : state === "running" ? (
        <span role="status" className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
          <Loader2 size={15} aria-hidden className="animate-spin" />
          {t.testing}
        </span>
      ) : (
        <div role="status" className="flex flex-col gap-1">
          <span className={`text-[14px] font-semibold ${tone}`}>{t.result[state]}</span>
          {detail && <span className="text-[12px] text-ink-muted">{detail}</span>}
          <span className="text-[13px] leading-snug text-ink-muted">{t.advice[state]}</span>
        </div>
      )}
    </div>
  );
}
