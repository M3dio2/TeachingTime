"use client";

import { useEffect } from "react";

// Sends an error the page caught to /api/report-error (once per error), and logs it.
export function useReportError(error: Error & { digest?: string }) {
  useEffect(() => {
    console.error(error);
    const body = JSON.stringify({
      message: error.message,
      digest: error.digest,
      page: window.location.pathname,
    });
    try {
      if (!navigator.sendBeacon?.("/api/report-error", new Blob([body], { type: "application/json" }))) {
        fetch("/api/report-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {}
  }, [error]);
}
