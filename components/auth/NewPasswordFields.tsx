"use client";

import { Check, Circle } from "lucide-react";
import { useState } from "react";
import PasswordField from "@/components/ui/PasswordField";
import { PASSWORD_MIN_LENGTH, passwordRules } from "@/lib/passwordRules";

// Password + "confirm password" for sign-up and reset. The rules sit in one row under the field
// and tick off as you type; one show/hide button shows both fields. The form checks
// passwordProblem() before sending.
export default function NewPasswordFields({
  label,
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
}: {
  label: string;
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <>
      <div className="flex flex-col gap-2">
        <PasswordField
          label={label}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          aria-describedby="password-rules"
          shown={shown}
          onShownChange={setShown}
          required
        />
        <ul id="password-rules" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {passwordRules.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.label} className={`flex items-center gap-1.5 ${met ? "text-ok" : "text-ink-muted"}`}>
                {met ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Circle size={14} aria-hidden />}
                {rule.label}
                <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-1">
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          autoComplete="new-password"
          invalid={mismatch}
          shown={shown}
          toggle={false}
          required
        />
        {mismatch && <p className="text-sm text-danger">The two passwords don&apos;t match.</p>}
      </div>
    </>
  );
}
