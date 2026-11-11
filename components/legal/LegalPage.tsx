import Link from "next/link";
import type { ReactNode } from "react";
import Wordmark from "@/components/ui/Wordmark";
import { LEGAL_UPDATED } from "@/lib/legal";

// Shared frame for the privacy policy and the terms: plain text, readable width.
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto w-full max-w-[720px] px-[clamp(16px,4vw,32px)] py-5">
        <Link href="/" aria-label="TeachingTime">
          <Wordmark size="sm" underline="still" />
        </Link>
      </header>
      <main className="legal mx-auto flex w-full max-w-[720px] flex-col gap-4 px-[clamp(16px,4vw,32px)] pt-2 pb-16 text-[15px] leading-relaxed">
        <h1 className="text-3xl">{title}</h1>
        <p className="text-sm text-ink-muted">Last updated: {LEGAL_UPDATED}</p>
        {children}
        <p className="mt-6 flex gap-4 text-sm">
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy policy
          </Link>
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>
        </p>
      </main>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-4 text-xl">{children}</h2>;
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}
