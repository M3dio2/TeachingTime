"use client";

import { Download } from "lucide-react";
import { createElement, useMemo } from "react";
import { fileIcon } from "@/components/files/fileIcon";
import { useT } from "@/lib/i18n/client";
import { useLoadedFile } from "@/lib/room/fileCache";
import type { FileTab } from "@/lib/room/tabs";
import type { RoomModel } from "./roomModel";

// F1: a text file (.txt, .md, .csv) in a tab, as plain text for both.
export function TextFilePane({ id, model }: { id: FileTab; model: RoomModel }) {
  const t = useT().stage.textFile;
  const { file, failed } = useLoadedFile(model.inviteSlug, id);
  const text = useMemo(() => (file?.bytes ? new TextDecoder().decode(file.bytes) : null), [file]);
  if (failed) return <p className="p-4 text-sm text-ink-muted">{t.failed}</p>;
  if (text === null) return <p className="p-4 text-sm text-ink-muted">{t.opening}</p>;
  return (
    <div className="h-full overflow-auto bg-surface">
      <pre data-testid="text-file" className="mx-auto max-w-[760px] px-6 py-5 font-sans text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
        {text}
      </pre>
    </div>
  );
}

// F1: any other file (PowerPoint, Excel, ZIP…): browsers can't show it, so a card with its
// name and a Download button, the same for both.
export function OtherFilePane({ id, model }: { id: FileTab; model: RoomModel }) {
  const t = useT().stage.otherFile;
  const { file, failed } = useLoadedFile(model.inviteSlug, id);
  const name = file?.name ?? model.names[id] ?? "";
  return (
    <div className="flex h-full items-center justify-center bg-paper p-6">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-3 rounded-panel border border-line bg-surface p-6 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-accent">
          {createElement(fileIcon("file", name), { size: 26, "aria-hidden": true })}
        </span>
        <span className="text-[17px] font-semibold break-all">{name}</span>
        <p className="text-sm text-ink-muted">{failed ? t.failed : t.cantShow}</p>
        {file?.src ? (
          <a
            href={file.src}
            download={file.name}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 font-semibold text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Download size={17} aria-hidden />
            {t.download}
          </a>
        ) : (
          !failed && <p className="text-sm text-ink-muted">{t.opening}</p>
        )}
      </div>
    </div>
  );
}
