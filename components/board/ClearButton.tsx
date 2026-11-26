"use client";

import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/Confirm";
import { useT } from "@/lib/i18n/client";

// Teacher only, in the Text and Draw toolbars: clears that tab for both people, after a confirm.
export default function ClearButton({ what, onClear }: { what: "text" | "drawing"; onClear: () => void }) {
  const t = useT();
  const label = what === "text" ? t.stage.clear.text : t.stage.clear.drawing;
  const ask = what === "text" ? t.stage.clear.textConfirm : t.stage.clear.drawingConfirm;
  const confirmIt = useConfirm();
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        void confirmIt({ message: ask, confirmLabel: t.common.clear }).then((ok) => ok && onClear());
      }}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Trash2 size={16} aria-hidden />
    </button>
  );
}
