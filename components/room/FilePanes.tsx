"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { MAX_BYTES, uploadResource } from "@/lib/files/uploadResource";
import { allInk, clearInk, inkedPdf, type InkItem, type PickedTool, savedName, useInk } from "@/lib/room/pdfInk";
import { type LoadedFile, useLoadedFile } from "@/lib/room/fileCache";
import type { FileTab } from "@/lib/room/tabs";
import { InkLayer, InkToolbar } from "./PdfInk";
import { isLandscape, showingLandscape } from "@/lib/room/presenting";
import { cap, type RoomModel } from "./roomModel";

function Message({ children }: { children: string }) {
  return <p className="flex h-full items-center justify-center bg-surface-2 p-4 text-sm text-ink-muted">{children}</p>;
}

function useFile(model: RoomModel, id: FileTab) {
  const { file, failed } = useLoadedFile(model.inviteSlug, id);
  return { file, failed };
}

// A picture tab: fitted into the pane on `surface-2`.
export function PicturePane({ id, model }: { id: FileTab; model: RoomModel }) {
  const t = useT();
  const { file, failed } = useFile(model, id);
  if (failed) return <Message>{t.stage.picture.failed}</Message>;
  if (!file?.src) return <Message>{t.stage.picture.opening}</Message>;
  const note =
    model.role === "teacher"
      ? t.stage.picture.teacherNote(cap(model.otherName))
      : t.stage.picture.studentNote(cap(model.otherName));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-2 p-5">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.src}
          alt={file.name}
          className="max-h-full max-w-full rounded border border-line bg-surface object-contain"
        />
      </div>
      <p className="text-[13px] text-ink-muted">{note}</p>
    </div>
  );
}

// pdf.js loads lazily (it needs the browser), with its worker from the same package.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function pdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return lib;
  });
  return pdfjsPromise;
}

// One parsed document per file for the session (re-opening a tab doesn't parse it again).
const docs = new Map<string, Promise<{ doc: PDFDocumentProxy; ratios: number[] }>>();
function openPdf(id: string, file: LoadedFile) {
  let p = docs.get(id);
  if (!p) {
    p = pdfjs().then(async (lib) => {
      // A copy: pdf.js hands the buffer to its worker, which empties the original.
      const doc = await lib.getDocument({ data: file.bytes!.slice(0) }).promise;
      const ratios: number[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
        ratios.push(vp.height / vp.width);
      }
      return { doc, ratios };
    });
    p.catch(() => docs.delete(id));
    docs.set(id, p);
  }
  return p;
}

const GAP = 12; // px between pages
const TOOLBAR = 42 + GAP; // the writing toolbar above the header row
const PAD = 16; // px around the pages
const COVERED = 8 + TOOLBAR; // the sticky toolbar (top-2) with a gap below
const HEADER = 32 + GAP; // the page row (page number, Pages/Slides, the note): one line, h-8
const MAX_W = 900;

// A PDF tab: every page as a canvas at the pane's width, drawn when it comes near the view.
// The teacher's scroll position is sent to the student (lib/sync/useViewSync.ts) as
// "page index + fraction into that page", so different widths line up.
export function PdfPane({ id, model }: { id: FileTab; model: RoomModel }) {
  const t = useT();
  const p = t.stage.pdf;
  const { file, failed } = useFile(model, id);
  const [pdf, setPdf] = useState<{ doc: PDFDocumentProxy; ratios: number[] } | null>(null);
  const [broken, setBroken] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(1);
  const teacher = model.role === "teacher";
  // Student: the teacher's position. Teacher: none (she leads).
  const followed = teacher ? undefined : model.sync.positionOf(id);
  // L2b: writing on the pages. Scroll is the default, so the PDF scrolls as before.
  const [tool, setTool] = useState<PickedTool>("scroll");
  const ink = useInk(model.doc, id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  // Slides view (the "Slides" switch): one page fitted into the stage.
  const landscape = pdf ? isLandscape(pdf.ratios) : false;
  // A landscape PDF is most likely a presentation: it opens as Slides (the teacher can switch).
  const slides = useSlides(model.doc, id, landscape);
  useEffect(() => {
    showingLandscape(id, landscape);
    return () => showingLandscape(id, false);
  }, [id, landscape]);
  // Teacher, the first time a presentation opens: it gets the stage to itself (one tab, the
  // files folded); Text stays a tab, and she can put them side by side again.
  useEffect(() => {
    if (!teacher || !landscape || viewMap(model.doc).has(id)) return;
    setSlides(model.doc, id, true);
    const index = model.view.tabs.indexOf(id);
    if (index >= 0) model.actions?.pick(index);
    model.actions?.setLayout("single");
    // Once per file and lesson: the view map remembers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher, landscape, id]);
  const slideArea = useRef<HTMLDivElement>(null);
  const [slideBox, setSlideBox] = useState({ w: 0, h: 0 });

  async function saveAsNew() {
    if (!file?.bytes || !model.lessonId) return;
    setSaving(true);
    setSaved(null);
    try {
      const bytes = await inkedPdf(file.bytes, allInk(model.doc, id));
      const name = savedName(model.names[id] ?? file.name);
      if (bytes.byteLength > MAX_BYTES) throw new Error(p.tooBig(name));
      const { data } = await createClient().auth.getUser();
      if (!data.user) throw new Error(p.logInAgain);
      const blob = Object.assign(new Blob([bytes as BlobPart], { type: "application/pdf" }), { name });
      const done = await uploadResource({
        teacherId: data.user.id,
        lessonId: model.lessonId,
        file: blob,
        contentType: "application/pdf",
        ext: "pdf",
        messages: t.dashboard.upload,
      });
      if ("error" in done) throw new Error(done.error);
      model.addFile?.({ id: done.id, kind: "pdf", name });
      setSaved(p.savedAs(name, model.filesTitle));
    } catch (e) {
      setSaved(e instanceof Error ? e.message : p.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!file?.bytes) return;
    let live = true;
    openPdf(id, file).then(
      (opened) => live && setPdf(opened),
      () => live && setBroken(true),
    );
    return () => {
      live = false;
    };
  }, [id, file]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [pdf]);

  const pageW = Math.max(0, Math.min(MAX_W, width - 2 * PAD));
  const heights = pdf ? pdf.ratios.map((r) => r * pageW) : [];
  const tops: number[] = [];
  heights.reduce((top, h, i) => {
    tops[i] = top;
    return top + h + GAP;
  }, PAD + TOOLBAR + HEADER); // the toolbar and the header row above the first page

  // The sticky toolbar covers the top of the view: a page "is at the top" just below it.
  const positionAt = (top: number) => {
    const scrollTop = top + COVERED;
    let i = 0;
    // +2: scrollTop is rounded, so landing exactly on a page's top can read a pixel short.
    while (i < tops.length - 1 && scrollTop + 2 >= tops[i + 1]) i++;
    const into = heights[i] ? (scrollTop - tops[i]) / heights[i] : 0;
    return i + Math.max(0, Math.min(0.999, into));
  };
  const scrollFor = (pos: number) => {
    const i = Math.min(Math.floor(pos), tops.length - 1);
    return i < 0 ? 0 : Math.max(0, tops[i] + (pos - i) * heights[i] - COVERED);
  };

  const ready = Boolean(pdf) && pageW > 0;
  const goTo = (pos: number) => {
    setPage(Math.floor(pos) + 1);
    const el = scroller.current;
    if (el && !slides) el.scrollTop = scrollFor(pos);
  };
  // Teacher: to a page (typed, or the slide arrows); the student follows.
  const jump = (index: number) => {
    if (!pdf) return;
    const i = Math.max(0, Math.min(pdf.doc.numPages - 1, index));
    goTo(i);
    model.sync.report?.(id, i);
  };

  useEffect(() => {
    const el = slideArea.current;
    if (!slides || !el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSlideBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [slides, pdf]);

  // Slides: ← → (and Page Up/Down) move both screens, unless she's typing somewhere.
  useEffect(() => {
    if (!slides || !teacher) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable=true], .excalidraw")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") jump(page);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") jump(page - 2);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Student: follow the teacher.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the page follows the synced position
    if (ready && followed !== undefined) goTo(followed);
    // goTo depends on the layout, which `ready` and pageW fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followed, ready, pageW, slides]);

  // Teacher: come back to where she was when the tab mounts again, or the width changes.
  useEffect(() => {
    if (!teacher || !ready) return;
    const pos = model.sync.positionOf(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- back to her saved position
    if (pos !== undefined) goTo(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher, ready, pageW, slides]);

  if (failed || broken) return <Message>{p.failed}</Message>;
  if (!pdf) return <Message>{p.opening}</Message>;

  const pages = pdf.doc.numPages;
  const note = teacher ? p.seesPage(cap(model.otherName), page) : p.choosesPage(cap(model.otherName));
  const toolbar = (
    <InkToolbar
      tool={tool}
      onTool={setTool}
      canEdit={model.canEdit}
      onClear={teacher ? () => clearInk(model.doc, id) : undefined}
      onSave={teacher && model.files ? saveAsNew : undefined}
      saving={saving}
    />
  );
  // The header row: the page (student) or Pages/Slides (teacher), and the note.
  const header = (
    <div className="flex h-8 w-full items-center justify-between gap-3 text-[13px] whitespace-nowrap text-ink-muted">
      {teacher ? (
        <span />
      ) : (
        <span data-testid="pdf-page" data-at={`${page}/${pages}`}>
          {p.pageOf(page, pages)}
        </span>
      )}
      <span className="truncate">{note}</span>
    </div>
  );
  // Teacher: ‹ Page [7] of 12 › | Pages Slides, floating at the bottom in both views (always in
  // reach). Type a page to jump; the student follows.
  const current = Math.min(page, pages) - 1;
  const pager = teacher && (
    <div className="sticky bottom-3 z-10 mx-auto flex w-fit shrink-0 items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-soft">
      <button
        type="button"
        onClick={() => jump(current - 1)}
        disabled={current === 0}
        aria-label={slides ? p.previousSlide : p.previousPage}
        title={slides ? p.previousSlide : p.previousPage}
        className={NAV}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <PageJump page={page} pages={pages} onJump={(n) => jump(n - 1)} />
      <button
        type="button"
        onClick={() => jump(current + 1)}
        disabled={current >= pages - 1}
        aria-label={slides ? p.nextSlide : p.nextPage}
        title={slides ? p.nextSlide : p.nextPage}
        className={NAV}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
      <span className="mx-1 h-6 w-px bg-line" aria-hidden />
      <SlidesSwitch slides={slides} onChange={(on) => setSlides(model.doc, id, on)} />
    </div>
  );

  if (slides) {
    const index = current;
    const ratio = pdf.ratios[index] ?? 0.75;
    const fitW = Math.max(0, Math.min(slideBox.w, slideBox.h / ratio));
    return (
      <div
        ref={scroller}
        data-testid="pdf-slides"
        className="@container relative flex h-full flex-col bg-surface-2"
        style={{ padding: PAD, gap: GAP }}
      >
        <div className="mx-auto flex w-full flex-col items-center" style={{ gap: GAP, maxWidth: MAX_W }}>
          {toolbar}
          {header}
        </div>
        <div ref={slideArea} className="flex min-h-0 flex-1 items-center justify-center">
          {fitW > 0 && (
            <PdfPage key={index} doc={pdf.doc} index={index} width={fitW} height={fitW * ratio} root={scroller}>
              <InkLayer
                doc={model.doc}
                file={id}
                page={index}
                items={ink.get(index) ?? NO_INK}
                tool={tool}
                canEdit={model.canEdit}
                width={fitW}
                height={fitW * ratio}
              />
            </PdfPage>
          )}
        </div>
        {pager}
      </div>
    );
  }

  return (
    <div
      ref={scroller}
      data-testid="pdf-scroller"
      className="@container relative h-full overflow-y-auto bg-surface-2"
      onScroll={(e) => {
        const el = e.currentTarget;
        // At the very end the last page can't scroll to the top: count it as on screen.
        const atEnd = el.scrollTop > 0 && el.scrollTop >= el.scrollHeight - el.clientHeight - 2;
        const pos = atEnd ? tops.length - 1 : positionAt(el.scrollTop);
        setPage(Math.floor(pos) + 1);
        if (teacher) model.sync.report?.(id, pos);
      }}
    >
      <div className="mx-auto flex flex-col items-center" style={{ padding: PAD, gap: GAP, maxWidth: MAX_W + 2 * PAD }}>
        {toolbar}
        {header}
        {heights.map((h, i) => (
          <PdfPage key={i} doc={pdf.doc} index={i} width={pageW} height={h} root={scroller}>
            <InkLayer
              doc={model.doc}
              file={id}
              page={i}
              items={ink.get(i) ?? NO_INK}
              tool={tool}
              canEdit={model.canEdit}
              width={pageW}
              height={h}
            />
          </PdfPage>
        ))}
      </div>
      {pager}
      {saved && (
        <p
          role="status"
          onAnimationEnd={() => setSaved(null)}
          className="sticky bottom-16 mx-auto w-fit max-w-[90%] animate-[fade-away_6s_forwards] rounded-panel bg-ink px-3.5 py-2 text-sm text-white"
        >
          {saved}
        </p>
      )}
    </div>
  );
}

const NAV =
  "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

// "Page [12] of 168": type a page and press Enter (or leave the field) to go there.
function PageJump({ page, pages, onJump }: { page: number; pages: number; onJump: (page: number) => void }) {
  const p = useT().stage.pdf;
  const [draft, setDraft] = useState<string | null>(null);
  const go = () => {
    if (draft === null) return;
    const n = Math.round(Number(draft));
    setDraft(null);
    if (Number.isFinite(n) && n >= 1) onJump(Math.min(n, pages));
  };
  return (
    <label
      className="flex items-center gap-1.5 px-1 text-sm text-ink-muted"
      data-testid="pdf-page"
      data-at={`${page}/${pages}`}
    >
      <span className="@max-[26rem]:sr-only">{p.pageWord}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={pages}
        aria-label={p.goToPage(pages)}
        value={draft ?? String(page)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={go}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
          if (e.key === "Escape") setDraft(null);
        }}
        className="h-8 w-14 rounded-md border border-line bg-surface px-1 text-center text-sm text-ink tabular-nums [appearance:textfield] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="whitespace-nowrap">{p.ofPages(pages)}</span>
    </label>
  );
}

// Pages (scroll through all of them) or Slides (one fills the stage; the arrows move both).
function SlidesSwitch({ slides, onChange }: { slides: boolean; onChange: (slides: boolean) => void }) {
  const p = useT().stage.pdf;
  const item = (on: boolean) =>
    `h-8 px-2.5 text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
      on ? "bg-ink text-paper" : "bg-surface text-ink hover:bg-surface-2"
    }`;
  return (
    <span role="group" aria-label={p.viewAs} className="mr-0.5 inline-flex overflow-hidden rounded-full border border-line">
      <button type="button" aria-pressed={!slides} onClick={() => onChange(false)} className={item(!slides)}>
        {p.pagesView}
      </button>
      <button
        type="button"
        aria-pressed={slides}
        onClick={() => onChange(true)}
        className={`${item(slides)} border-l border-line`}
      >
        {p.slidesView}
      </button>
    </span>
  );
}

// Slides or pages, per PDF tab, in the lesson doc (the student follows; nothing extra to send).
const viewMap = (doc: Y.Doc) => doc.getMap<string>("pdfView");
function setSlides(doc: Y.Doc, id: string, on: boolean) {
  viewMap(doc).set(id, on ? "slides" : "pages");
}
function useSlides(doc: Y.Doc, id: string, landscape: boolean) {
  return useSyncExternalStore(
    (change) => {
      viewMap(doc).observe(change);
      return () => viewMap(doc).unobserve(change);
    },
    () => (viewMap(doc).get(id) ?? (landscape ? "slides" : "pages")) === "slides",
    () => false,
  );
}

const NO_INK: [string, InkItem][] = [];

function PdfPage({
  doc,
  index,
  width,
  height,
  root,
  children,
}: {
  children?: React.ReactNode;
  doc: PDFDocumentProxy;
  index: number;
  width: number;
  height: number;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const t = useT();
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      root: root.current,
      rootMargin: "100% 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near || width <= 0) return;
    let task: { cancel: () => void } | null = null;
    let live = true;
    doc.getPage(index + 1).then((pdfPage) => {
      const c = canvas.current;
      if (!live || !c) return;
      const dpr = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: (width / pdfPage.getViewport({ scale: 1 }).width) * dpr });
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      const render = pdfPage.render({ canvas: c, viewport });
      task = render;
      render.promise.catch(() => {});
    });
    return () => {
      live = false;
      task?.cancel();
    };
  }, [near, width, doc, index]);

  return (
    <div
      ref={box}
      data-page={index + 1}
      className="relative shrink-0 overflow-hidden rounded border border-line bg-surface"
      style={{ width, height }}
    >
      {near && <canvas ref={canvas} aria-label={t.stage.pdf.page(index + 1)} style={{ width: "100%", height: "100%" }} />}
      {children}
    </div>
  );
}
