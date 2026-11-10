// A1: the audio the teacher plays, as published in her `audio` attribute. The student's bar
// runs on its own from these values (no message per second): while playing, the position is
// (now - startedAt); while paused, it's pausedAt. Clocks of the two computers may differ by a
// little; the bar is only a guide, the sound itself comes over LiveKit.
export type AudioState = {
  id: string; // resource id
  name: string;
  duration: number; // seconds
  startedAt: number; // ms since epoch at which position 0 would have played
  pausedAt: number | null; // seconds, while paused
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function audioPosition(a: AudioState, now = Date.now()) {
  const pos = a.pausedAt ?? (now - a.startedAt) / 1000;
  return Math.max(0, Math.min(a.duration || 0, pos));
}

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// The student's side: checked before use; anything odd means "no audio".
export function cleanAudio(raw: unknown): AudioState | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const a = JSON.parse(raw);
    const ok =
      a &&
      typeof a.id === "string" &&
      UUID.test(a.id) &&
      typeof a.name === "string" &&
      a.name.length <= 300 &&
      Number.isFinite(a.duration) &&
      a.duration >= 0 &&
      Number.isFinite(a.startedAt) &&
      (a.pausedAt === null || Number.isFinite(a.pausedAt));
    return ok
      ? { id: a.id, name: a.name, duration: a.duration, startedAt: a.startedAt, pausedAt: a.pausedAt }
      : null;
  } catch {
    return null;
  }
}
