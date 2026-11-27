"use client";

import { Check, ChevronDown, Ellipsis, Globe, LogOut, MessageSquare, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { removeLesson, sendFeedback, setLanguage, setTeacherName, signOut } from "@/app/(app)/dashboard/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/locales";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useConfirmSubmit } from "@/components/ui/Confirm";
import SubmitButton, { useFormPending } from "@/components/ui/SubmitButton";

// A small popover that closes on outside click and Escape.
function usePopover() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      // Not while our confirm dialog is up (its form would be gone before it submits).
      if (!wrap.current?.contains(e.target as Node) && !(e.target as Element).closest?.("[role=alertdialog]")) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return { open, setOpen, wrap };
}

function Popover({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute top-full right-0 z-30 mt-1.5 rounded-panel border border-line bg-surface p-1.5 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

// Header: the teacher's initial and name (only the initial on phones). Opens her account menu
// (review B2): the name students see in lessons, Settings, Log out.
const MENU_ITEM =
  "flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium text-ink hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

export function NameChip({ name }: { name: string }) {
  const { open, setOpen, wrap } = usePopover();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const t = useT();
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        title={t.dashboard.changeNameTitle}
        aria-label={t.dashboard.accountLabel(name || t.dashboard.addYourName)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-1 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:pr-3"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink font-display text-[13px] font-extrabold text-marker">
          {initial}
        </span>
        <span className="hidden max-w-40 truncate md:inline">{name || t.dashboard.addYourName}</span>
        <ChevronDown size={14} aria-hidden className="hidden text-ink-muted md:inline" />
      </button>
      {open && (
        <Popover className="w-72 p-1.5">
          {/* Her name for students, then the menu items (all one style). */}
          <form
            action={async (data) => {
              await setTeacherName(data);
              setOpen(false);
            }}
            className="flex flex-col gap-1.5 p-2"
          >
            <label htmlFor="teacher-name" className="text-[13px] font-medium text-ink-muted">
              {t.dashboard.nameInLessons}
            </label>
            <div className="flex gap-2">
              <input
                id="teacher-name"
                name="name"
                defaultValue={name}
                placeholder={t.dashboard.namePlaceholder}
                maxLength={40}
                autoFocus
                required
                className={`${inputClass()} !h-10 min-w-0 flex-1`}
              />
              <SubmitButton size="sm" className="h-10 shrink-0 px-3.5 font-semibold" pending={t.common.saving}>
                {t.common.save}
              </SubmitButton>
            </div>
          </form>
          <div className="my-1 h-px bg-line" />
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} className={MENU_ITEM}>
            <Settings size={16} aria-hidden className="text-ink-muted" />
            {t.cloud.settings}
          </Link>
          <form action={signOut}>
            <button type="submit" className={MENU_ITEM}>
              <LogOut size={16} aria-hidden className="text-ink-muted" />
              {t.dashboard.logOut}
            </button>
          </form>
        </Popover>
      )}
    </div>
  );
}

// Header: the language of TeachingTime for this teacher (I1). Shows the current language's
// code (EN, DE …) and opens the four choices, each in its own language.
export function LanguageMenu() {
  const { open, setOpen, wrap } = usePopover();
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={`${t.common.language}: ${LOCALE_NAMES[locale]}`}
        title={t.common.chooseLanguage}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Globe size={16} aria-hidden />
        <span className="uppercase">{locale}</span>
      </button>
      {open && (
        <Popover className="w-48">
          <div role="menu" aria-label={t.common.language} aria-busy={pending || undefined}>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={l === locale}
                lang={l}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await setLanguage(l);
                    setOpen(false);
                    router.refresh();
                  })
                }
                className="flex h-10 w-full items-center justify-between gap-2.5 rounded-md px-2.5 text-left text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
              >
                {LOCALE_NAMES[l]}
                {l === locale && <Check size={16} aria-hidden className="text-accent" />}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

// Header: "Feedback" opens a short form (G1: seeing how people react). Icon only on phones.
export function FeedbackButton() {
  const { open, setOpen, wrap } = usePopover();
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const t = useT();
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={t.dashboard.sendFeedback}
        title={t.dashboard.sendFeedback}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (state !== "sending") setState("idle");
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <MessageSquare size={16} aria-hidden />
        <span className="hidden md:inline">{t.dashboard.feedback}</span>
      </button>
      {open && (
        <Popover className="w-80 max-w-[calc(100vw-2rem)] p-3">
          {state === "sent" ? (
            <p className="flex items-start gap-2 p-1 text-sm">
              <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-accent" />
              {t.dashboard.feedbackThanks}
            </p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setState("sending");
                const ok = await sendFeedback(text, window.location.pathname);
                setState(ok ? "sent" : "failed");
                if (ok) setText("");
              }}
              className="flex flex-col gap-3"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t.dashboard.feedbackQuestion}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  required
                  autoFocus
                  placeholder={t.dashboard.feedbackPlaceholder}
                  className={`${inputClass()} h-auto resize-y py-2 font-normal`}
                />
              </label>
              {state === "failed" && (
                <p className="text-sm text-danger">{t.dashboard.feedbackFailed}</p>
              )}
              <Button disabled={state === "sending" || !text.trim()} className="h-10">
                {state === "sending" ? t.common.sending : t.common.send}
              </Button>
            </form>
          )}
        </Popover>
      )}
    </div>
  );
}

// A card's ⋯ menu: Remove, with today's confirm.
export function CardMenu({ id, name }: { id: string; name: string }) {
  const { open, setOpen, wrap } = usePopover();
  const t = useT();
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={t.dashboard.moreFor(name)}
        title={t.common.more}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Ellipsis size={16} aria-hidden />
      </button>
      {open && (
        <Popover className="w-56">
          <form action={removeLesson} role="menu">
            <input type="hidden" name="id" value={id} />
            <RemoveItem name={name} />
          </form>
        </Popover>
      )}
    </div>
  );
}

function RemoveItem({ name }: { name: string }) {
  const pending = useFormPending();
  const t = useT();
  const confirmSubmit = useConfirmSubmit();
  return (
    <button
      role="menuitem"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(e) => confirmSubmit(e, { message: t.dashboard.removeConfirm(name), confirmLabel: t.common.remove })}
      className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium text-danger hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
    >
      <Trash2 size={16} aria-hidden />
      {pending ? t.common.removing : t.dashboard.removeName(name)}
    </button>
  );
}
