"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import LoadingScreen from "@/components/room/LoadingScreen";
import { useT } from "@/lib/i18n/client";
import Button from "./Button";
import { useConfirmSubmit } from "./Confirm";

type Props = React.ComponentProps<typeof Button> & {
  pending: ReactNode; // shown while the form's action runs, e.g. "Saving…"
  confirm?: string; // ask first (B14: our own dialog, components/ui/Confirm.tsx)
  confirmLabel?: string; // its button, e.g. "Delete" (default: Remove)
};

// A form's submit button with a pending state (D5d: small actions that keep you on the page).
export default function SubmitButton({ pending, confirm: ask, confirmLabel, children, onClick, disabled, ...props }: Props) {
  const status = useFormStatus();
  const confirmSubmit = useConfirmSubmit();
  const t = useT();
  return (
    <Button
      {...props}
      disabled={disabled || status.pending}
      aria-busy={status.pending || undefined}
      onClick={(e) => {
        if (ask) confirmSubmit(e, { message: ask, confirmLabel: confirmLabel ?? t.common.remove });
        onClick?.(e);
      }}
    >
      {status.pending ? pending : children}
    </Button>
  );
}

// True while the surrounding form's action runs (for buttons that aren't <Button>).
export function useFormPending() {
  return useFormStatus().pending;
}

// D5d: a wait that takes you into a lesson. While the form runs, the full loading screen covers
// the page; the lesson page shows the same screen until the call is connected.
export function LessonStartScreen() {
  const t = useT();
  return useFormStatus().pending ? <LoadingScreen title={t.common.gettingLessonReady} /> : null;
}
