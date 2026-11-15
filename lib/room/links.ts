// Links in the classroom (G2): YouTube videos play in the call for both, any other link is
// shown as a card that both can open.

// The 11-character video id from the usual YouTube addresses, or null.
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
        id = m ? m[2] : null;
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// Where the video starts, from "?t=90", "&t=1m30s" or "?start=90".
export function youtubeStart(url: string): number {
  try {
    const u = new URL(url);
    const t = u.searchParams.get("t") ?? u.searchParams.get("start");
    if (!t) return 0;
    if (/^\d+$/.test(t)) return Number(t);
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
  } catch {
    return 0;
  }
}

// What a link is called when the teacher gives no name: the site and the start of the path.
export function linkLabel(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : decodeURIComponent(u.pathname).replace(/\/$/, "");
    const label = `${u.hostname.replace(/^www\./, "")}${path}`;
    return label.length > 80 ? `${label.slice(0, 77)}…` : label;
  } catch {
    return url.slice(0, 80);
  }
}

export function normalizeUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 2000) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// What the teacher's YouTube player is doing, published in her `video` attribute; the
// student's player follows it. Position now = at + (playing ? (now - ts) / 1000 : 0).
export type VideoState = { tab: string; playing: boolean; at: number; ts: number };

export function videoPosition(v: VideoState, now = Date.now()) {
  return Math.max(0, v.at + (v.playing ? (now - v.ts) / 1000 : 0));
}

// The student's side: checked before use; anything odd means "no video state".
export function cleanVideo(raw: unknown): VideoState | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const v = JSON.parse(raw);
    const ok =
      v &&
      typeof v.tab === "string" &&
      /^video:[0-9a-f-]{36}$/.test(v.tab) &&
      typeof v.playing === "boolean" &&
      Number.isFinite(v.at) &&
      v.at >= 0 &&
      Number.isFinite(v.ts);
    return ok ? { tab: v.tab, playing: v.playing, at: v.at, ts: v.ts } : null;
  } catch {
    return null;
  }
}
