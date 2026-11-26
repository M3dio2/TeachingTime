"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { useT } from "@/lib/i18n/client";

export type PickClassroom = { id: string; title: string };

// Which Classrooms get a Library file (the answer to "10+ students"): one switch for all of
// them (new ones included), otherwise a searchable list with Select all / None for what's
// shown, and a count. Works the same for one file and for several (then it only adds).
export default function ClassroomPicker({
  title,
  classrooms,
  initialAll = false,
  initial = [],
  addOnly = false,
  onSave,
  onClose,
}: {
  title: string;
  classrooms: PickClassroom[];
  initialAll?: boolean;
  initial?: string[];
  addOnly?: boolean;
  onSave: (all: boolean, ids: string[]) => Promise<{ error: string } | null>;
  onClose: () => void;
}) {
  const t = useT().library;
  const [all, setAll] = useState(initialAll);
  const [chosen, setChosen] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const q = query.trim().toLocaleLowerCase();
  const shown = q ? classrooms.filter((c) => c.title.toLocaleLowerCase().includes(q)) : classrooms;
  const many = classrooms.length > 6;

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("[role=switch]")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const toggle = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setShown = (on: boolean) =>
    setChosen((s) => {
      const n = new Set(s);
      for (const c of shown) {
        if (on) n.add(c.id);
        else n.delete(c.id);
      }
      return n;
    });
  const save = () =>
    start(async () => {
      setError(false);
      const done = await onSave(all, [...chosen]);
      if (done?.error) setError(true);
      else onClose();
    });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-video/45 p-3 sm:items-center" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(640px,92dvh)] w-full max-w-[440px] flex-col gap-3.5 rounded-panel bg-surface p-5 text-ink shadow-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="picker-title" className="min-w-0 text-[18px] font-semibold break-words">
            {t.pickerTitle(title)}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.close} className={buttonClass("ghost", "sm", "h-9 w-9 shrink-0 px-0! text-ink!")}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <Switch checked={all} onChange={setAll} className="rounded-md border border-line bg-paper px-3.5!">
          <span className="flex flex-col py-2">
            <span className="font-semibold">{t.allClassrooms}</span>
            <span className="text-[13px] text-ink-muted">{t.allClassroomsHint}</span>
          </span>
        </Switch>

        {!all && (
          <>
            {many && (
              <label className="relative">
                <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="h-10 w-full rounded-md border border-line bg-surface pr-3 pl-9 text-[15px] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                />
              </label>
            )}
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-muted" aria-live="polite">
                {t.selected(chosen.size, classrooms.length)}
              </span>
              <span className="flex gap-1">
                <button type="button" onClick={() => setShown(true)} disabled={!shown.length} className="rounded px-2 py-1 font-medium text-accent hover:bg-surface-2 disabled:opacity-40">
                  {q ? t.selectShown(shown.length) : t.selectAll}
                </button>
                <button type="button" onClick={() => setShown(false)} className="rounded px-2 py-1 font-medium text-accent hover:bg-surface-2">
                  {t.selectNone}
                </button>
              </span>
            </div>
            <ul className="-mx-1 min-h-[120px] flex-1 overflow-y-auto px-1" aria-label={t.choose}>
              {shown.map((c) => (
                <li key={c.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={chosen.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span aria-hidden className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-sm font-extrabold text-accent">
                      {c.title.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-[15px]">{c.title}</span>
                  </label>
                </li>
              ))}
              {!shown.length && <li className="px-2 py-3 text-sm text-ink-muted">{t.noMatch}</li>}
            </ul>
          </>
        )}
        {addOnly && !all && <p className="text-[13px] text-ink-muted">{t.addOnly}</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t.failed}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" onClick={onClose} className={buttonClass("ghost", "md", "h-11 px-4 text-ink!")}>
            {t.cancel}
          </button>
          <button type="button" onClick={save} disabled={pending} className={buttonClass("primary", "md", "h-11 px-5 font-semibold")}>
            {pending ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
