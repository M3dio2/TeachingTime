"use client";

import { useReportError } from "@/components/ErrorReport";
import "./globals.css";

// When even the main layout fails: a plain page of its own (it replaces <html>).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useReportError(error);
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-paper p-4 font-sans text-ink">
        <main className="flex max-w-sm flex-col gap-3 rounded-panel border border-line bg-surface p-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-ink-muted">Sorry about that. We&apos;ve been told about it. Please reload the page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 rounded-md bg-accent px-4 font-medium text-white"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
