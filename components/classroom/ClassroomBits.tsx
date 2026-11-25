"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui/Button";
import { useFormPending } from "@/components/ui/SubmitButton";
import { useConfirmSubmit } from "@/components/ui/Confirm";
import { useT } from "@/lib/i18n/client";

const noop = () => () => {};

// The header's way back (outside the page's <Suspense>, so the texts come from the client).
export function BackToClassrooms() {
  const t = useT();
  return (
    <Link href="/dashboard" className={buttonClass("ghost", "sm", "h-9 text-ink!")}>
      <ArrowLeft size={16} aria-hidden />
      {t.dashboard.yourClassrooms}
    </Link>
  );
}

export function ClassroomLoading() {
  return <p className="text-ink-muted">{useT().common.loading}</p>;
}

// The student link, shown in full (read-only, selects on focus).
export function LinkField({ slug, label }: { slug: string; label: string }) {
  const origin = useSyncExternalStore(noop, () => window.location.host, () => "");
  return (
    <input
      readOnly
      aria-label={label}
      value={`${origin}/join/${slug}`}
      onFocus={(e) => e.currentTarget.select()}
      className="h-10 min-w-0 flex-1 rounded-md border border-line bg-paper px-2.5 text-sm text-ink-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
    />
  );
}

// "Remove this classroom", away from Start lesson, with today's confirm.
export function RemoveButton({ name }: { name: string }) {
  const pending = useFormPending();
  const t = useT();
  const confirmSubmit = useConfirmSubmit();
  return (
    <button
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(e) => confirmSubmit(e, { message: t.dashboard.removeConfirm(name), confirmLabel: t.common.remove })}
      className="-ml-2 inline-flex h-9 items-center gap-1.5 self-start rounded-md px-2 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
    >
      <Trash2 size={16} aria-hidden />
      {pending ? t.common.removing : t.dashboard.removeClassroom}
    </button>
  );
}
