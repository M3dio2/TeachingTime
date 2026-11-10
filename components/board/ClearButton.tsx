import { Trash2 } from "lucide-react";

// Teacher only, in the Text and Draw toolbars: clears that tab for both people, after a confirm.
export default function ClearButton({ what, onClear }: { what: "text" | "drawing"; onClear: () => void }) {
  const label = `Clear the ${what} for both of you`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        if (confirm(`Clear the ${what} for both of you?`)) onClear();
      }}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Trash2 size={16} aria-hidden />
    </button>
  );
}
