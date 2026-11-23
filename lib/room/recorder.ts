// R1: recording a lesson in the teacher's browser. Nothing goes to our servers: the video is
// put together here (canvas + Web Audio), recorded with MediaRecorder and written to the
// browser's private file storage (OPFS) while it runs, so a long lesson doesn't fill the memory
// and a closed tab doesn't lose it. At the end the teacher downloads it (or saves it to a cloud).
//
// What is recorded is the teacher's choice (`RecordWhat`):
// - screen + cameras: the lesson tab as she sees it
// - screen only: the tab cropped to the stage (files, board, a shared screen)
// - cameras only: both cameras side by side
// - nothing but voices: an audio file

export type RecordWhat = { voices: boolean; cameras: boolean; screen: boolean };
export const RECORD_ALL: RecordWhat = { voices: true, cameras: true, screen: true };
export const recordsVideo = (w: RecordWhat) => w.cameras || w.screen;
export const recordsSomething = (w: RecordWhat) => w.voices || recordsVideo(w);

export function cleanWhat(raw: unknown): RecordWhat | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const w = { voices: r.voices === true, cameras: r.cameras === true, screen: r.screen === true };
  return recordsSomething(w) ? w : null;
}

// Shared with the student through the teacher's LiveKit attribute `rec` (JSON).
export type RecState =
  | { state: "asking"; id: string; what: RecordWhat }
  | { state: "on"; id: string; what: RecordWhat; since: number };

export function cleanRecState(raw: string | undefined): RecState | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    const what = cleanWhat(r.what);
    if (!what || typeof r.id !== "string" || r.id.length > 64) return null;
    if (r.state === "asking") return { state: "asking", id: r.id, what };
    if (r.state === "on" && typeof r.since === "number") return { state: "on", id: r.id, what, since: r.since };
  } catch {}
  return null;
}

// The student's answer, a reliable data message to the teacher.
export const REC_TOPIC = "rec";
export type RecReply = { id: string; answer: "yes" | "no" | "stop" };
export function cleanReply(payload: Uint8Array): RecReply | null {
  try {
    const r = JSON.parse(new TextDecoder().decode(payload));
    if (typeof r.id === "string" && (r.answer === "yes" || r.answer === "no" || r.answer === "stop")) return r;
  } catch {}
  return null;
}

export const canRecordScreen = () =>
  typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";
export const canRecord = () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

// MP4 where the browser can (plays everywhere, also on iPhones), else WebM.
export function pickMimeType(video: boolean): string {
  const options = video
    ? ["video/mp4;codecs=avc1.42E01F,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
    : ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}
export const extensionFor = (mime: string) => (mime.includes("mp4") ? (mime.startsWith("audio") ? "m4a" : "mp4") : "webm");

// "TeachingTime – Lucía – 2026-11-23 14.05.mp4" (no characters that file systems refuse).
export function recordingName(student: string, started: Date, ext: string) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${started.getFullYear()}-${pad(started.getMonth() + 1)}-${pad(started.getDate())}`;
  const time = `${pad(started.getHours())}.${pad(started.getMinutes())}`;
  const who = student.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 40) || "Lesson";
  return `TeachingTime – ${who} – ${date} ${time}.${ext}`;
}

// ---- Storage: chunks go to OPFS when the browser has it, else stay in memory. ----

const DIR = "recordings";

type Sink = { write: (chunk: Blob) => Promise<void>; finish: () => Promise<File> };

async function opfsDir() {
  try {
    const root = await navigator.storage?.getDirectory?.();
    return root ? await root.getDirectoryHandle(DIR, { create: true }) : null;
  } catch {
    return null;
  }
}

async function openSink(name: string, mime: string): Promise<Sink> {
  const dir = await opfsDir();
  if (dir) {
    try {
      const handle = await dir.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      let queue = Promise.resolve();
      return {
        write: (chunk) => (queue = queue.then(() => writable.write(chunk))),
        finish: async () => {
          await queue;
          await writable.close();
          const file = await handle.getFile();
          return new File([file], name, { type: mime });
        },
      };
    } catch {}
  }
  const chunks: Blob[] = [];
  return {
    write: async (chunk) => void chunks.push(chunk),
    finish: async () => new File(chunks, name, { type: mime }),
  };
}

// Recordings still in the browser's storage (finished ones are removed after saving; an
// unsaved one is left over when the tab was closed during a recording).
export async function leftoverRecordings(): Promise<File[]> {
  const dir = await opfsDir();
  if (!dir) return [];
  const files: File[] = [];
  // @ts-expect-error: values() is in every browser with OPFS, not yet in TypeScript's DOM types
  for await (const entry of dir.values() as AsyncIterable<FileSystemHandle>) {
    if (entry.kind !== "file") continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    if (file.size > 0) files.push(file);
    else await dir.removeEntry(entry.name).catch(() => {});
  }
  return files;
}

export async function forgetRecording(name: string) {
  const dir = await opfsDir();
  await dir?.removeEntry(name).catch(() => {});
}

export function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---- The recording itself ----

export type Sources = {
  // Tracks of the call (LiveKit's MediaStreamTracks); missing ones are left out.
  myMic?: MediaStreamTrack;
  theirMic?: MediaStreamTrack;
  myCamera?: MediaStreamTrack;
  theirCamera?: MediaStreamTrack;
  myName: string;
  theirName: string;
  stage?: () => DOMRect | null; // where the stage is in the tab (for "screen only")
};

export type Recording = {
  stop: () => Promise<File>;
  onEnded: (fn: () => void) => void; // the teacher ended the screen capture in the browser bar
};

const W = 1280;
const H = 720;
const FPS = 24;

const videoOf = (track: MediaStreamTrack) => {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.srcObject = new MediaStream([track]);
  void v.play().catch(() => {});
  return v;
};

// Asks the browser for the lesson tab (it shows its own prompt). Call it right in the click.
export async function captureTab(withAudio: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: FPS, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: withAudio,
    // Chrome: offer this tab first, and its audio (the other person, YouTube, lesson audio).
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
    systemAudio: "include",
  } as DisplayMediaStreamOptions);
}

export async function startRecording(
  what: RecordWhat,
  sources: Sources,
  tab: MediaStream | null,
  name: (ext: string) => string,
): Promise<Recording> {
  const cleanups: (() => void)[] = [];
  const out = new MediaStream();

  // Sound: my microphone, plus the tab's sound if we have it (it already holds the other
  // person's voice), else the other person's microphone.
  let audio: AudioContext | null = null;
  if (what.voices) {
    audio = new AudioContext();
    const mix = audio.createMediaStreamDestination();
    const tabAudio = tab?.getAudioTracks()[0];
    for (const track of [sources.myMic, tabAudio ?? sources.theirMic]) {
      if (track && track.readyState === "live") audio.createMediaStreamSource(new MediaStream([track])).connect(mix);
    }
    mix.stream.getAudioTracks().forEach((t) => out.addTrack(t));
    cleanups.push(() => void audio?.close().catch(() => {}));
  }

  // Picture: drawn into a canvas, FPS times a second.
  if (recordsVideo(what)) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const tabVideo = tab?.getVideoTracks()[0] ? videoOf(tab.getVideoTracks()[0]) : null;
    const cams = [
      { track: sources.myCamera, name: sources.myName },
      { track: sources.theirCamera, name: sources.theirName },
    ].map((c) => ({ ...c, video: c.track ? videoOf(c.track) : null }));
    const surface = tab?.getVideoTracks()[0]?.getSettings().displaySurface;

    const fit = (v: HTMLVideoElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => {
      const scale = Math.min(dw / sw, dh / sh);
      const w = sw * scale;
      const h = sh * scale;
      const x = dx + (dw - w) / 2;
      const y = dy + (dh - h) / 2;
      ctx.drawImage(v, sx, sy, sw, sh, x, y, w, h);
      return { x, y, w, h };
    };
    const draw = () => {
      ctx.fillStyle = "#1f1813";
      ctx.fillRect(0, 0, W, H);
      if (what.screen && tabVideo && tabVideo.videoWidth) {
        const vw = tabVideo.videoWidth;
        const vh = tabVideo.videoHeight;
        const r = !what.cameras && surface === "browser" ? sources.stage?.() : null;
        if (r && r.width > 0) {
          // The tab is captured at its own size: map the stage's page position to the frame.
          const sx = vw / window.innerWidth;
          const sy = vh / window.innerHeight;
          fit(tabVideo, r.left * sx, r.top * sy, r.width * sx, r.height * sy, 0, 0, W, H);
        } else fit(tabVideo, 0, 0, vw, vh, 0, 0, W, H);
      } else if (what.cameras) {
        const live = cams.filter((c) => c.video);
        const slot = W / Math.max(1, live.length);
        live.forEach((c, i) => {
          const v = c.video!;
          if (!v.videoWidth) return;
          const box = fit(v, 0, 0, v.videoWidth, v.videoHeight, i * slot + 8, 8, slot - 16, H - 16);
          // The name in the corner of the picture, as in the lesson's camera tiles.
          ctx.font = "600 20px system-ui, sans-serif";
          const tw = ctx.measureText(c.name).width;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(box.x + 12, box.y + box.h - 46, tw + 20, 34);
          ctx.fillStyle = "#fff";
          ctx.fillText(c.name, box.x + 22, box.y + box.h - 22);
        });
      }
    };
    // setInterval, not requestAnimationFrame: keeps drawing when the tab is in the background.
    draw();
    const timer = setInterval(draw, 1000 / FPS);
    cleanups.push(() => clearInterval(timer));
    canvas.captureStream(FPS).getVideoTracks().forEach((t) => out.addTrack(t));
  }

  const video = recordsVideo(what);
  const mimeType = pickMimeType(video);
  const fileName = name(extensionFor(mimeType || (video ? "video/webm" : "audio/webm")));
  const sink = await openSink(fileName, mimeType || (video ? "video/webm" : "audio/webm"));
  const recorder = new MediaRecorder(out, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: 1_200_000, // ~550 MB an hour
    audioBitsPerSecond: 96_000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size) void sink.write(e.data);
  };
  recorder.start(5000); // a chunk every 5 s goes to storage

  let ended: (() => void) | null = null;
  tab?.getVideoTracks()[0]?.addEventListener("ended", () => ended?.());

  return {
    onEnded: (fn) => (ended = fn),
    stop: () =>
      new Promise<File>((resolve) => {
        recorder.onstop = async () => {
          cleanups.forEach((c) => c());
          out.getTracks().forEach((t) => t.stop());
          tab?.getTracks().forEach((t) => t.stop());
          resolve(await sink.finish());
        };
        if (recorder.state === "inactive") recorder.onstop(new Event("stop"));
        else recorder.stop();
      }),
  };
}
