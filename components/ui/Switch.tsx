import type { ReactNode } from "react";

// A role="switch" row (docs/DESIGN.md, "Switch"): label on the left, the track on the right,
// `ok` when on.
export default function Switch({
  checked,
  onChange,
  icon,
  children,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-13 w-full items-center gap-3 px-1 text-left text-base text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${className}`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      <span
        aria-hidden
        className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-ok" : "bg-line"}`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-surface transition-[left] ${
            checked ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}
