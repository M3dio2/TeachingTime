"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { type LoadedFile, useLoadedFile } from "@/lib/room/fileCache";
import type { FileTab } from "@/lib/room/tabs";
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
  const { file, failed } = useFile(model, id);
  if (failed) return <Message>This picture couldn&apos;t be opened.</Message>;
  if (!file?.src) return <Message>Opening the picture…</Message>;
  const note =
    model.role === "teacher"
      ? `${cap(model.otherName)} sees this picture`
      : `${cap(model.otherName)} is showing this picture`;
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
const PAD = 16; // px around the pages
const MAX_W = 900;

// A PDF tab: every page as a canvas at the pane's width, drawn when it comes near the view.
// The teacher's scroll position is sent to the student (lib/sync/useViewSync.ts) as
// "page index + fraction into that page", so different widths line up.
export function PdfPane({ id, model }: { id: FileTab; model: RoomModel }) {
  const { file, failed } = useFile(model, id);
  const [pdf, setPdf] = useState<{ doc: PDFDocumentProxy; ratios: number[] } | null>(null);
  const [broken, setBroken] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(1);
  const teacher = model.role === "teacher";
  // Student: the teacher's position. Teacher: none (she leads).
  const followed = teacher ? undefined : model.sync.positionOf(id);

  useEffect(() => {
    if (!file?.bytes) return;
    let live = true;
    openPdf(id, file).then(
      (p) => live && setPdf(p),
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
  }, PAD + 28); // the header row above the first page

  const positionAt = (scrollTop: number) => {
    let i = 0;
    while (i < tops.length - 1 && scrollTop >= tops[i + 1]) i++;
    const into = heights[i] ? (scrollTop - tops[i]) / heights[i] : 0;
    return i + Math.max(0, Math.min(0.999, into));
  };
  const scrollFor = (pos: number) => {
    const i = Math.min(Math.floor(pos), tops.length - 1);
    return i < 0 ? 0 : tops[i] + (pos - i) * heights[i];
  };

  const ready = Boolean(pdf) && pageW > 0;
  const goTo = (pos: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = scrollFor(pos);
    setPage(Math.floor(pos) + 1);
  };

  // Student: follow the teacher.
  useEffect(() => {
    if (ready && followed !== undefined) goTo(followed);
    // goTo depends on the layout, which `ready` and pageW fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followed, ready, pageW]);

  // Teacher: come back to where she was when the tab mounts again, or the width changes.
  useEffect(() => {
    if (!teacher || !ready) return;
    const pos = model.sync.positionOf(id);
    if (pos !== undefined) goTo(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher, ready, pageW]);

  if (failed || broken) return <Message>This PDF couldn&apos;t be opened.</Message>;
  if (!pdf) return <Message>Opening the PDF…</Message>;

  const pages = pdf.doc.numPages;
  const note = teacher ? `${cap(model.otherName)} sees page ${page}` : `${cap(model.otherName)} chooses the page`;

  return (
    <div
      ref={scroller}
      data-testid="pdf-scroller"
      className="h-full overflow-y-auto bg-surface-2"
      onScroll={(e) => {
        const pos = positionAt(e.currentTarget.scrollTop);
        setPage(Math.floor(pos) + 1);
        if (teacher) model.sync.report?.(id, pos);
      }}
    >
      <div className="mx-auto flex flex-col items-center" style={{ padding: PAD, gap: GAP, maxWidth: MAX_W + 2 * PAD }}>
        <div className="flex h-4 w-full justify-between gap-2 text-[13px] text-ink-muted">
          <span>
            Page {page} of {pages}
          </span>
          <span>{note}</span>
        </div>
        {heights.map((h, i) => (
          <PdfPage key={i} doc={pdf.doc} index={i} width={pageW} height={h} root={scroller} />
        ))}
      </div>
    </div>
  );
}

function PdfPage({
  doc,
  index,
  width,
  height,
  root,
}: {
  doc: PDFDocumentProxy;
  index: number;
  width: number;
  height: number;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
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
      className="shrink-0 overflow-hidden rounded border border-line bg-surface"
      style={{ width, height }}
    >
      {near && <canvas ref={canvas} aria-label={`Page ${index + 1}`} style={{ width: "100%", height: "100%" }} />}
    </div>
  );
}
