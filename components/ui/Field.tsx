import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string; // a short line under the field
  invalid?: boolean; // danger border (the error itself is shown elsewhere)
};

export const inputClass = (invalid?: boolean) =>
  `h-11 w-full rounded-md border bg-surface px-3 text-base font-normal text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
    invalid ? "border-danger" : "border-line"
  }`;

// Labelled text input, 44 px high. The label is visible, not just a placeholder (docs/DESIGN.md).
export default function Field({ label, hint, invalid, className = "", ...props }: Props) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium text-ink ${className}`}>
      {label}
      <input className={inputClass(invalid)} aria-invalid={invalid || undefined} {...props} />
      {hint && <span className="text-[13px] font-normal text-ink-muted">{hint}</span>}
    </label>
  );
}
