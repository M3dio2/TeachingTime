"use client";

import { Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

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
  return (
    <button
      onClick={(e) => {
        if (!confirm(`Remove ${name}? Their link will stop working and their files are deleted.`)) e.preventDefault();
      }}
      className="-ml-2 inline-flex h-9 items-center gap-1.5 self-start rounded-md px-2 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Trash2 size={16} aria-hidden />
      Remove this classroom
    </button>
  );
}
