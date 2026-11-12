import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, TAGLINE } from "@/lib/site";

// The picture in link previews (WhatsApp, Mail, Messages, LinkedIn): the name, the tagline with
// a marker stroke, and a small drawing of the room. Made at build time.
export const alt = `${SITE_NAME}: ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#3B2A1E";
const MUTED = "#76604F";
const PAPER = "#FAF6F0";
const SURFACE = "#FFFFFF";
const SURFACE_2 = "#F3EBE0";
const LINE = "#E6D9C8";
const MARKER = "#F4D35E";
const VIDEO = "#2E2620";
const ACCENT = "#8B5E3C";

export default async function OpenGraphImage() {
  const [display, body] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BricolageGrotesque-800.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-500.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: PAPER, display: "flex", padding: 64, gap: 48, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: INK, color: MARKER, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bricolage", fontSize: 36 }}>
              T
            </div>
            <div style={{ fontFamily: "Bricolage", fontSize: 40, color: INK }}>{SITE_NAME}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Bricolage", fontSize: 68, lineHeight: 1.04, color: INK, letterSpacing: -2 }}>
              <span>One calm room</span>
              <span style={{ display: "flex" }}>
                for&nbsp;
                <span style={{ position: "relative", display: "flex" }}>
                  <span style={{ position: "absolute", left: -4, right: -4, bottom: 6, height: 22, background: MARKER, borderRadius: 11, transform: "rotate(-1.5deg)" }} />
                  <span style={{ position: "relative" }}>one-to-one</span>
                </span>
              </span>
              <span>lessons</span>
            </div>
            <div style={{ fontSize: 28, color: MUTED, lineHeight: 1.35 }}>
              Video, whiteboard, your PDFs, Word files and audio. Students join with a link.
            </div>
          </div>
          <div style={{ fontSize: 24, color: ACCENT }}>teachingtime.app · free while it&apos;s new</div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%", height: 400, display: "flex", gap: 14, padding: 16, background: SURFACE, border: `2px solid ${LINE}`, borderRadius: 18 }}>
            <div style={{ width: 120, display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 92, borderRadius: 10, background: VIDEO, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 17, background: MUTED }} />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", border: `2px solid ${LINE}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: 40, background: SURFACE_2, display: "flex", alignItems: "flex-end", gap: 8, padding: "0 12px" }}>
                <div style={{ width: 96, height: 30, background: SURFACE, borderRadius: "8px 8px 0 0", display: "flex", alignItems: "flex-end", padding: "0 0 6px 14px" }}>
                  <div style={{ width: 56, height: 6, borderRadius: 3, background: MARKER }} />
                </div>
                <div style={{ width: 84, height: 30, background: SURFACE, opacity: 0.6, borderRadius: "8px 8px 0 0" }} />
              </div>
              <div style={{ flex: 1, display: "flex", gap: 10, padding: 12, background: PAPER }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: 14, background: SURFACE, border: `3px solid ${ACCENT}`, borderRadius: 10 }}>
                  <div style={{ width: "60%", height: 12, borderRadius: 6, background: INK }} />
                  {[90, 80, 86, 70].map((w) => (
                    <div key={w} style={{ width: `${w}%`, height: 9, borderRadius: 5, background: LINE }} />
                  ))}
                  <div style={{ width: "45%", height: 14, borderRadius: 7, background: MARKER, opacity: 0.7 }} />
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: SURFACE, border: `3px solid ${LINE}`, borderRadius: 10 }}>
                  <div style={{ width: 96, height: 54, borderRadius: 48, border: `6px solid ${MARKER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 52, height: 5, borderRadius: 3, background: INK }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: display, weight: 800, style: "normal" },
        { name: "Geist", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
