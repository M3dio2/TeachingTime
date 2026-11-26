"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n/client";
import { useLoadedFile } from "@/lib/room/fileCache";
import type { FileTab } from "@/lib/room/tabs";
import type { RoomModel } from "./roomModel";

// F1: a text file (.txt) in a tab, as plain text for both.
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
