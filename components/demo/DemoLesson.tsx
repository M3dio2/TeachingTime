"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import LessonRoom from "@/components/room/LessonRoom";
import { buttonClass } from "@/components/ui/Button";
import Wordmark from "@/components/ui/Wordmark";
import { DEMO_FILES, DEMO_SLUG, DEMO_STUDENT } from "@/lib/demo/content";
import { useT } from "@/lib/i18n/client";
import { DemoProvider } from "./DemoContext";

// Review A1: /demo. The lesson room as a teacher sees it, with Lucía, and after leaving a short
// "That was the demo" page. A new run (Try again) starts from a clean room.
const LESSON = {
  id: "demo",
  inviteSlug: DEMO_SLUG,
  title: DEMO_STUDENT,
  files: DEMO_FILES,
  snapshot: null,
  saveBoard: false,
};

export default function DemoLesson() {
  const t = useT().demo;
  const [run, setRun] = useState(1);
  const [left, setLeft] = useState(false);

  if (left) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-[480px] flex-col gap-5 rounded-panel border border-line bg-surface p-7">
          <Wordmark size="sm" underline="none" />
          <h1 className="text-[30px] leading-[1.15] tracking-[-0.02em]">{t.endTitle}</h1>
          <p className="text-ink-muted">{t.endText}</p>
          <Link href="/signup" className={buttonClass("primary", "md", "h-12 text-base font-semibold")}>
            {t.createClassroom}
            <ArrowRight size={18} aria-hidden />
          </Link>
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setLeft(false);
                setRun((n) => n + 1);
              }}
              className={buttonClass("ghost", "md", "h-10 px-3 text-ink!")}
            >
              <RotateCcw size={16} aria-hidden />
              {t.again}
            </button>
            <Link href="/" className={buttonClass("ghost", "md", "h-10 px-3 text-ink!")}>
              {t.home}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <DemoProvider key={run} onLeave={() => setLeft(true)}>
      <LessonRoom token="" role="teacher" lesson={LESSON} demo onLeave={() => setLeft(true)} />
    </DemoProvider>
  );
}
