import { useEffect, useState } from "react";
import * as Y from "yjs";

// L2b: writing on PDF tabs. One flat Y.Map "pdfInk" in the lesson Y.Doc, keyed by item id, so
// two people drawing at once never clash and the eraser just deletes keys. Coordinates are
// fractions of the page width (both axes), so every screen size lines up.
export type InkTool = "pen" | "highlighter" | "text";
export type InkItem = {
  file: string; // the tab id, e.g. "pdf:<uuid>"
  page: number; // 0-based
  tool: InkTool;
  pts?: number[]; // pen / highlighter: x0, y0, x1, y1, …
  at?: [number, number]; // text: its baseline start
  text?: string;
};
export type PickedTool = "scroll" | InkTool | "eraser";

export const PEN_WIDTH = 0.003;
export const HIGHLIGHT_WIDTH = 0.02;
export const TEXT_SIZE = 0.03;

const inkMap = (doc: Y.Doc) => doc.getMap<InkItem>("pdfInk");

const round = (n: number) => Math.round(n * 10000) / 10000;

// The items on one PDF, by page; re-renders when anyone changes them.
export function useInk(doc: Y.Doc, file: string) {
  const [items, setItems] = useState<Map<number, [string, InkItem][]>>(() => collect(doc, file));
  useEffect(() => {
    const map = inkMap(doc);
    const update = () => setItems(collect(doc, file));
    update();
    map.observe(update);
    return () => map.unobserve(update);
  }, [doc, file]);
  return items;
}

function collect(doc: Y.Doc, file: string) {
  const byPage = new Map<number, [string, InkItem][]>();
  for (const [id, item] of inkMap(doc)) {
    if (item.file !== file) continue;
    const list = byPage.get(item.page) ?? [];
    list.push([id, item]);
    byPage.set(item.page, list);
  }
  return byPage;
}

export function addInk(doc: Y.Doc, item: InkItem) {
  const clean: InkItem = { ...item, pts: item.pts?.map(round), at: item.at && [round(item.at[0]), round(item.at[1])] };
  if (!clean.pts) delete clean.pts;
  if (!clean.at) delete clean.at;
  inkMap(doc).set(crypto.randomUUID(), clean);
}

export function removeInk(doc: Y.Doc, ids: string[]) {
  const map = inkMap(doc);
  doc.transact(() => ids.forEach((id) => map.delete(id)));
}

// "Clear" in the PDF toolbar: this PDF's writing, for both.
export function clearInk(doc: Y.Doc, file: string) {
  const map = inkMap(doc);
  doc.transact(() => {
    for (const [id, item] of map) if (item.file === file) map.delete(id);
  });
}

export function inkCount(doc: Y.Doc, file: string) {
  let n = 0;
  for (const item of inkMap(doc).values()) if (item.file === file) n++;
  return n;
}

// SVG path in page-width units.
export function pathOf(pts: number[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0]} ${pts[1]}`;
  if (pts.length === 2) return `${d} L${pts[0] + 0.0001} ${pts[1]}`; // a dot
  for (let i = 2; i < pts.length; i += 2) d += ` L${pts[i]} ${pts[i + 1]}`;
  return d;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Eraser: the items on this page within `radius` of the point.
export function hits(items: [string, InkItem][], x: number, y: number, radius = 0.012) {
  const out: string[] = [];
  for (const [id, item] of items) {
    if (item.tool === "text" && item.at && item.text) {
      const w = item.text.length * TEXT_SIZE * 0.55;
      const [tx, ty] = item.at;
      if (x >= tx - radius && x <= tx + w + radius && y >= ty - TEXT_SIZE - radius && y <= ty + radius) out.push(id);
      continue;
    }
    const pts = item.pts ?? [];
    const reach = radius + (item.tool === "highlighter" ? HIGHLIGHT_WIDTH / 2 : PEN_WIDTH);
    for (let i = 0; i < pts.length; i += 2) {
      const ax = pts[i];
      const ay = pts[i + 1];
      const bx = pts[i + 2] ?? ax;
      const by = pts[i + 3] ?? ay;
      if (distToSegment(x, y, ax, ay, bx, by) <= reach) {
        out.push(id);
        break;
      }
    }
  }
  return out;
}

// "Save as new PDF": the original bytes with every item drawn on its page (pdf-lib, in the
// browser). Coordinates go from page-width fractions to PDF points on the page's crop box.
export async function inkedPdf(bytes: ArrayBuffer, items: InkItem[]) {
  const { PDFDocument, rgb, StandardFonts, LineCapStyle } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes.slice(0));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const ink = rgb(0x3b / 255, 0x2a / 255, 0x1e / 255); // --color-ink
  const marker = rgb(0xf4 / 255, 0xd3 / 255, 0x5e / 255); // --color-marker
  for (const item of items) {
    const page = pages[item.page];
    if (!page) continue;
    const box = page.getCropBox();
    const scale = box.width; // one page-width unit in points
    const top = box.y + box.height;
    if (item.tool === "text" && item.at && item.text) {
      page.drawText(item.text, {
        x: box.x + item.at[0] * scale,
        y: top - item.at[1] * scale,
        size: TEXT_SIZE * scale,
        font,
        color: ink,
      });
    } else if (item.pts?.length) {
      const highlight = item.tool === "highlighter";
      page.drawSvgPath(pathOf(item.pts), {
        x: box.x,
        y: top,
        scale,
        borderColor: highlight ? marker : ink,
        borderWidth: highlight ? HIGHLIGHT_WIDTH : PEN_WIDTH,
        borderOpacity: highlight ? 0.5 : 1,
        borderLineCap: LineCapStyle.Round,
      });
    }
  }
  return pdf.save();
}

// "Spa menu.pdf" → "Spa menu (10 Nov 2026).pdf"
export function savedName(name: string, date = new Date()) {
  const base = name.replace(/\.pdf$/i, "");
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${base} (${day}).pdf`;
}

export function allInk(doc: Y.Doc, file: string) {
  return [...inkMap(doc).values()].filter((i) => i.file === file);
}
