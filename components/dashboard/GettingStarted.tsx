"use client";

import { Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { useT } from "@/lib/i18n/client";

// Review A7 + A3: a short "Getting started" list on the dashboard until it's done or hidden:
// a Classroom, its link sent, a test lesson (open the student link on your phone), a file.
export const LINK_COPIED_KEY = "tt-link-copied";
const HIDDEN_KEY = "tt-getting-started-hidden";
const noop = () => () => {};

export default function GettingStarted({
  first,
  hasLesson,
  hasFile,
}: {
  first: { id: string; name: string; slug: string } | null;
  hasLesson: boolean;
  hasFile: boolean;
}) {
  const t = useT().dashboard.start;
  const copied = useSyncExternalStore(noop, () => localStorage.getItem(LINK_COPIED_KEY) === "1", () => false);
  const hiddenStored = useSyncExternalStore(noop, () => localStorage.getItem(HIDDEN_KEY) === "1", () => true);
  const [hidden, setHidden] = useState(false);
  const steps = [
    { done: !!first, title: t.classroom, text: t.classroomText, action: null },
    {
      done: copied || hasLesson,
      title: t.link,
      text: first ? t.linkText(first.name) : t.linkTextNone,
      action: first ? <CopyLinkButton slug={first.slug} label={t.copyLink} name={first.name} /> : null,
    },
    {
      done: hasLesson,
      title: t.test,
      text: t.testText,
      action: first ? (
        <a
          href={`/join/${first.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium whitespace-nowrap hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <ExternalLink size={15} aria-hidden />
          {t.openStudentView}
        </a>
      ) : null,
    },
    {
      done: hasFile,
      title: t.file,
      text: t.fileText,
      action: first ? (
        <Link
          href={`/dashboard/${first.id}`}
          className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-sm font-medium whitespace-nowrap hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {t.openClassroom}
        </Link>
      ) : null,
    },
  ];
  const left = steps.filter((s) => !s.done).length;
  if (hidden || hiddenStored || left === 0) return null;
  const next = steps.findIndex((s) => !s.done);
  return (
    <section aria-labelledby="getting-started" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="getting-started" className="text-[18px] font-semibold">
            {t.title}
          </h2>
          <span className="text-sm text-ink-muted">{t.progress(steps.length - left, steps.length)}</span>
        </div>
        <button
          type="button"
          aria-label={t.hide}
          title={t.hide}
          onClick={() => {
            localStorage.setItem(HIDDEN_KEY, "1");
            setHidden(true);
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <ol className="flex flex-col">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line py-3 first:border-t-0 first:pt-0">
            <span
              aria-hidden
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                s.done ? "bg-ok text-white" : i === next ? "bg-marker text-ink" : "bg-surface-2 text-ink-muted"
              }`}
            >
              {s.done ? <Check size={15} /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-[1_1_220px] flex-col">
              <span className={`font-medium ${s.done ? "text-ink-muted line-through" : ""}`}>
                {s.title}
                <span className="sr-only">{s.done ? ` (${t.done})` : ""}</span>
              </span>
              {!s.done && <span className="text-sm text-ink-muted">{s.text}</span>}
            </span>
            {!s.done && i === next && s.action}
          </li>
        ))}
      </ol>
    </section>
  );
}
