"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { removeLesson, setTeacherName } from "@/app/dashboard/actions";
import Field from "@/components/ui/Field";
import SubmitButton, { useFormPending } from "@/components/ui/SubmitButton";

// A small popover that closes on outside click and Escape.
function usePopover() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
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

// Header: the teacher's initial and name (only the initial on phones). Opens a small form to
// change the name students see in lessons.
export function NameChip({ name }: { name: string }) {
  const { open, setOpen, wrap } = usePopover();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        title="Change the name students see in lessons"
        aria-label={name ? `Your name in lessons: ${name}. Change it` : "Add your name"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-1 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:pr-3"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink font-display text-[13px] font-extrabold text-marker">
          {initial}
        </span>
        <span className="hidden max-w-40 truncate md:inline">{name || "Add your name"}</span>
        <Pencil size={14} aria-hidden className="hidden text-ink-muted md:inline" />
      </button>
      {open && (
        <Popover className="w-72 p-3">
          <form
            action={async (data) => {
              await setTeacherName(data);
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <Field
              label="Your name in lessons"
              name="name"
              defaultValue={name}
              placeholder="e.g. Ms Smith"
              maxLength={40}
              autoFocus
              required
            />
            <SubmitButton className="h-10" pending="Saving…">
              Save
            </SubmitButton>
          </form>
        </Popover>
      )}
    </div>
  );
}

// A card's ⋯ menu: Remove, with today's confirm.
export function CardMenu({ id, name }: { id: string; name: string }) {
  const { open, setOpen, wrap } = usePopover();
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={`More for ${name}`}
        title="More"
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
  return (
    <button
      role="menuitem"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (!confirm(`Remove ${name}? Their link will stop working and their files are deleted.`)) {
          e.preventDefault();
        }
      }}
      className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium text-danger hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
    >
      <Trash2 size={16} aria-hidden />
      {pending ? "Removing…" : `Remove ${name}`}
    </button>
  );
}
