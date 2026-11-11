"use client";

import { ClipboardCopy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLoadedFile } from "@/lib/room/fileCache";
import { type FileTab, tabLabel } from "@/lib/room/tabs";
import { sendToTextPad } from "@/lib/room/textInbox";
import { cap, type RoomModel } from "./roomModel";

const PAD = 16; // px around the pages
const MAX_SCALE = 1.25;

function Message({ children }: { children: string }) {
  return <p className="flex h-full items-center justify-center bg-surface-2 p-4 text-sm text-ink-muted">{children}</p>;
}

// A Word file tab (G2). docx-preview draws the pages in the browser with their own layout
// (A4 or Letter, tables, pictures); the pages are then scaled to the pane's width, so both
// people see the same lines and the teacher's scroll position (a fraction of the document's
// height, lib/sync/useViewSync.ts) lands on the same place for the student.
// The teacher can copy the text into the shared text pad to work on it together.
export default function DocPane({ id, model }: { id: FileTab; model: RoomModel }) {
  const { file, failed } = useLoadedFile(model.inviteSlug, id);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [broken, setBroken] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [paneW, setPaneW] = useState(0);
  const [page, setPage] = useState({ at: 1, of: 1 });
  const [copied, setCopied] = useState<string | null>(null);
  const teacher = model.role === "teacher";
  const followed = teacher ? undefined : model.sync.positionOf(id);

  // Draw the document once the bytes are here (again whenever the tab mounts).
  useEffect(() => {
    const el = content.current;
    if (!file?.bytes || !el) return;
    let live = true;
    el.replaceChildren();
    import("docx-preview")
      .then(({ renderAsync }) =>
        renderAsync(file.bytes!.slice(0), el, el, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          useBase64URL: true, // pictures as data: URLs (no blob URLs to clean up)
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderComments: false,
          renderChanges: false,
        }),
      )
      .then(() => {
        if (!live) return;
        // The library's grey backdrop gives way to the pane's own.
        const wrapper = el.querySelector<HTMLElement>(".docx-wrapper");
        if (wrapper) {
          wrapper.style.background = "transparent";
          wrapper.style.padding = `${PAD}px`;
        }
        setPage({ at: 1, of: Math.max(1, el.querySelectorAll("section.docx").length) });
        setRendered(true);
      })
      .catch((error) => {
        console.error("Word file", error);
        if (live) setBroken(true);
      });
    return () => {
      live = false;
    };
  }, [file]);

  // The pages' own size, and the pane's width.
  useEffect(() => {
    const el = content.current;
    const pane = scroller.current;
    if (!el || !pane || !rendered) return;
    const measure = () => setNatural({ w: el.scrollWidth, h: el.scrollHeight });
    const a = new ResizeObserver(measure);
    a.observe(el);
    const b = new ResizeObserver(([entry]) => setPaneW(entry.contentRect.width));
    b.observe(pane);
    measure();
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, [rendered]);

  const scale = natural.w && paneW ? Math.min(MAX_SCALE, paneW / natural.w) : 0;
  const height = natural.h * scale;
  const ready = rendered && scale > 0;

  const pageAt = (scrollTop: number) => {
    const pages = content.current?.querySelectorAll<HTMLElement>("section.docx") ?? [];
    let at = 1;
    pages.forEach((p, i) => {
      if (p.offsetTop * scale <= scrollTop + 40) at = i + 1;
    });
    return { at, of: Math.max(1, pages.length) };
  };

  const goTo = (pos: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = pos * height;
    setPage(pageAt(el.scrollTop));
  };

  // Student: follow the teacher. Teacher: back to her place when the tab mounts again.
  useEffect(() => {
    if (!ready) return;
    const pos = teacher ? model.sync.positionOf(id) : followed;
    if (pos !== undefined) goTo(pos);
    // goTo depends on the layout, which `ready` and `height` fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followed, ready, height]);

  async function copyToTextPad() {
    if (!file?.bytes) return;
    setCopied("Copying…");
    try {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.convertToHtml({ arrayBuffer: file.bytes.slice(0) });
      const html = value.replace(/<img[^>]*>/g, ""); // the text pad has no pictures
      if (!html.trim()) throw new Error("empty");
      sendToTextPad(model.doc, html);
      const { tabs } = model.view;
      const textAt = tabs.indexOf("text");
      let replaced: string | null = null;
      if (textAt !== -1) model.actions?.pick(textAt);
      else if (tabs.length < 2) model.actions?.open("text");
      else {
        const other = tabs.findIndex((t) => t !== id);
        replaced = tabLabel(tabs[other], model.names);
        model.actions?.openAt("text", other);
      }
      setCopied(
        `Copied into the text pad${replaced ? `, which took ${replaced}'s place` : ""}. Pictures stay in the Word file.`,
      );
    } catch {
      setCopied("The text couldn't be copied from this file.");
    }
  }

  if (failed || broken) return <Message>This Word file couldn&apos;t be opened.</Message>;

  const note = teacher ? `${cap(model.otherName)} sees page ${page.at}` : `${cap(model.otherName)} chooses the page`;

  return (
    <div
      ref={scroller}
      data-testid="doc-scroller"
      className="relative h-full overflow-y-auto bg-surface-2"
      onScroll={(e) => {
        const top = e.currentTarget.scrollTop;
        setPage(pageAt(top));
        if (teacher && height > 0) model.sync.report?.(id, top / height);
      }}
    >
      <div className="sticky top-0 z-10 flex min-h-11 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-1.5 text-[13px] text-ink-muted">
        <span>
          Page {page.at} of {page.of}
        </span>
        <span className="flex-1" />
        <span>{note}</span>
        {teacher && (
          <button
            type="button"
            disabled={!file?.bytes || copied === "Copying…"}
            onClick={copyToTextPad}
            title="Put the text into the text pad, where you can both work on it"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-ink hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50"
          >
            <ClipboardCopy size={16} aria-hidden />
            Copy into the text pad
          </button>
        )}
      </div>
      {!ready && <Message>Opening the Word file…</Message>}
      {/* The pages at their own size, scaled to the pane (the box below takes the scaled size). */}
      <div className="mx-auto overflow-hidden" style={{ width: natural.w * scale || undefined, height: height || undefined }}>
        <div
          ref={content}
          data-testid="doc-pages"
          className="w-max origin-top-left"
          style={{ transform: scale ? `scale(${scale})` : undefined, visibility: ready ? "visible" : "hidden" }}
        />
      </div>
      {copied && copied !== "Copying…" && (
        <p
          role="status"
          onAnimationEnd={() => setCopied(null)}
          className="sticky bottom-3 mx-auto w-fit max-w-[90%] animate-[fade-away_6s_forwards] rounded-panel bg-ink px-3.5 py-2 text-sm text-white"
        >
          {copied}
        </p>
      )}
    </div>
  );
}
