import type { ReactNode } from "react";

// A small label (docs/DESIGN.md, "Label chip"): `marker` for "look here" labels ("Following
// Laura", "On screen"), `muted` for quiet states ("View only"), `ok` for "can write here".
export default function Chip({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: "marker" | "muted" | "ok";
  children: ReactNode;
  className?: string;
}) {
  const colors = {
    marker: "bg-marker-soft text-marker-ink",
    muted: "bg-surface-2 text-ink-muted",
    ok: "bg-surface-2 text-ok",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-medium whitespace-nowrap ${colors} ${className}`}
    >
      {children}
    </span>
  );
}
