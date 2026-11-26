"use client";

import { AlertTriangle } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { buttonClass } from "./Button";

// Review B14: our own confirm dialog instead of the browser's grey box. It names the thing
// ("Delete worksheet.pdf?") and its button says what happens ("Delete"), with Cancel focused
// first so Enter never deletes by accident. `useConfirm()` returns a function that resolves
// to true or false.
export type ConfirmOptions = { message: string; confirmLabel: string; detail?: string; danger?: boolean };
type Ask = (o: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const ask = useCallback<Ask>((o) => new Promise((resolve) => setOpen({ ...o, resolve })), []);
  const close = (ok: boolean) => {
    open?.resolve(ok);
    setOpen(null);
  };
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {open && <ConfirmDialog options={open} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

// Outside a provider (shouldn't happen): the browser's own confirm.
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  return ask ?? (async (o) => window.confirm(o.message));
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const t = useT();
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const danger = options.danger !== false;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={options.message}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-panel bg-surface p-5 text-ink shadow-soft"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle size={18} aria-hidden />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1 pt-1.5">
            <p className="text-[16px] font-semibold break-words">{options.message}</p>
            {options.detail && <p className="text-sm text-ink-muted">{options.detail}</p>}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button ref={cancel} type="button" onClick={() => onClose(false)} className={buttonClass("secondary", "md", "h-11 px-4")}>
            {t.common.cancel}
          </button>
          <button
            type="button"
            data-testid="confirm-yes"
            onClick={() => onClose(true)}
            className={buttonClass("primary", "md", `h-11 px-4 font-semibold ${danger ? "!bg-danger hover:!bg-danger/90" : ""}`)}
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// For a form's submit button: ask first, then submit the form with this button.
export function useConfirmSubmit() {
  const ask = useConfirm();
  return (e: React.MouseEvent<HTMLButtonElement>, o: ConfirmOptions) => {
    e.preventDefault();
    const button = e.currentTarget;
    void ask(o).then((ok) => ok && button.form?.requestSubmit(button));
  };
}
