"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import LoadingScreen from "@/components/room/LoadingScreen";
import Button from "./Button";

type Props = React.ComponentProps<typeof Button> & {
  pending: ReactNode; // shown while the form's action runs, e.g. "Saving…"
  confirm?: string; // ask first (server-action forms can't confirm on their own)
};

// A form's submit button with a pending state (D5d: small actions that keep you on the page).
export default function SubmitButton({ pending, confirm: ask, children, onClick, disabled, ...props }: Props) {
  const status = useFormStatus();
  return (
    <Button
      {...props}
      disabled={disabled || status.pending}
      aria-busy={status.pending || undefined}
      onClick={(e) => {
        if (ask && !window.confirm(ask)) e.preventDefault();
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
  return useFormStatus().pending ? <LoadingScreen title="Getting your lesson ready" /> : null;
}
