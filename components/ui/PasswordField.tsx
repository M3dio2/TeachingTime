"use client";

import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useId, useState } from "react";
import { inputClass } from "./Field";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  aside?: ReactNode; // on the right of the label ("Forgot your password?")
  invalid?: boolean;
  shown?: boolean; // controlled show/hide (sign-up: both fields together)
  onShownChange?: (shown: boolean) => void;
  toggle?: boolean; // false: no button (the confirm field follows the first one)
};

// A password input with a show/hide button (docs/design/HANDOFF.md, "Sign in").
export default function PasswordField({
  label,
  aside,
  invalid,
  shown: shownProp,
  onShownChange,
  toggle = true,
  className = "",
  ...props
}: Props) {
  const id = useId();
  const [own, setOwn] = useState(false);
  const shown = shownProp ?? own;
  const setShown = onShownChange ?? setOwn;
  const label2 = shown ? "Hide password" : "Show password";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          className={`${inputClass(invalid)} ${toggle ? "pr-12" : ""}`}
          aria-invalid={invalid || undefined}
          {...props}
        />
        {toggle && (
          <button
            type="button"
            aria-label={label2}
            title={label2}
            onClick={() => setShown(!shown)}
            className="absolute top-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}
