import type { ReactNode } from "react";
import Marker from "./Marker";

// A segmented control (docs/DESIGN.md): options in a `surface-2` track, the chosen one on
// `surface` with the marker underline (the room's one stroke on phones). An option can carry
// an extra button (the × on a phone tab).
export type Segment = {
  id: string;
  label: ReactNode;
  extra?: ReactNode;
};

export default function Segmented({
  label,
  segments,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  segments: Segment[];
  value: string;
  onChange?: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid min-w-0 flex-1 gap-1 rounded-md bg-surface-2 p-[3px]"
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      {segments.map((s) => {
        const on = s.id === value;
        return (
          <div
            key={s.id}
            className={`relative isolate flex h-10 min-w-0 items-center rounded-md ${on ? "bg-surface" : ""}`}
          >
            <button
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange?.(s.id)}
              className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 truncate px-2 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                on ? "font-semibold text-ink" : "font-medium text-ink-muted"
              }`}
            >
              {s.label}
            </button>
            {s.extra}
            {on && (
              <Marker
                key={s.id}
                shape="underline"
                className="absolute bottom-1 left-[27%] -z-10 h-1.5 w-[46%]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
