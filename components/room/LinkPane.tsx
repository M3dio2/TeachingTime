"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { useLoadedFile } from "@/lib/room/fileCache";
import { linkLabel } from "@/lib/room/links";
import type { FileTab } from "@/lib/room/tabs";
import { cap, type RoomModel } from "./roomModel";

// A link tab (G2): most sites refuse to be shown inside another page, so the link is a card
// that each person opens in a new browser tab.
export default function LinkPane({ id, model }: { id: FileTab; model: RoomModel }) {
  const { file, failed } = useLoadedFile(model.inviteSlug, id);
  if (failed) {
    return <p className="flex h-full items-center justify-center bg-surface-2 p-4 text-sm text-ink-muted">This link couldn&apos;t be opened.</p>;
  }
  const teacher = model.role === "teacher";
  return (
    <div className="flex h-full items-center justify-center bg-surface-2 p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-panel border border-line bg-surface p-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-accent">
          <Link2 size={22} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg font-semibold break-words">{file?.name ?? "Opening the link…"}</p>
          {file?.url && <p className="truncate text-sm text-ink-muted">{linkLabel(file.url)}</p>}
        </div>
        {file?.url && (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 font-semibold text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Open the link
            <ExternalLink size={16} aria-hidden />
          </a>
        )}
        <p className="text-[13px] text-ink-muted">
          {teacher
            ? `${cap(model.otherName)} sees this card and can open the link too. It opens in a new tab, the lesson keeps running.`
            : `${cap(model.otherName)} shared this link. It opens in a new tab; come back here afterwards.`}
        </p>
      </div>
    </div>
  );
}
