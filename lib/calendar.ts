// The calendar (migration 0018): a Classroom's lessons as "slots" (once, or every week from a
// first lesson, optionally until a day), plus changes to single lessons of a weekly series
// (cancelled, or moved). Pure functions: the dashboard, the calendar page, the Classroom page,
// the student's join page and the calendar feed all expand the same data the same way.
//
// Weekly lessons keep their local time in the zone they were planned in (17:00 in Zurich stays
// 17:00 when the clocks change), so the times are computed in that zone, not by adding 7 × 24 h.

export type Slot = {
  id: string;
  lesson_id: string;
  starts_at: string; // ISO, the first lesson
  minutes: number;
  weekly: boolean;
  ends_on: string | null; // "2027-06-30": a weekly series' last day (in its zone)
  time_zone: string;
};

export type SlotChange = {
  slot_id: string;
  occurs_at: string; // ISO: when that lesson was meant to start
  cancelled: boolean;
  moved_to: string | null;
  moved_minutes: number | null;
};

export type Occurrence = {
  key: string; // `${slot}:${original start ms}`, stable across moves
  slotId: string;
  lessonId: string;
  start: Date;
  minutes: number;
  original: Date; // the series' time for this lesson (before a move)
  weekly: boolean;
  cancelled: boolean;
  moved: boolean;
};

export const LENGTHS = [30, 45, 60, 90] as const;
export const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// The wall-clock parts of `d` in `zone`.
function partsIn(d: Date, zone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone(zone),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, s: +p.second };
}

export function safeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

// The UTC instant of a wall-clock time in `zone` (DST gaps move forward, like calendars do).
export function zonedTime(y: number, m: number, d: number, h: number, min: number, zone: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess;
  for (let i = 0; i < 3; i++) {
    const p = partsIn(new Date(t), zone);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
    const diff = asUtc - guess;
    if (diff === 0) break;
    t -= diff;
  }
  return new Date(t);
}

// "2027-06-30" of `d` in `zone`.
export function dayIn(d: Date, zone: string) {
  const p = partsIn(d, zone);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

// The series' n-th lesson (0 = the first).
function nth(slot: Slot, n: number): Date {
  const first = new Date(slot.starts_at);
  if (n === 0) return first;
  const p = partsIn(first, slot.time_zone);
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d) + n * WEEK_MS);
  return zonedTime(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), p.h, p.min, slot.time_zone);
}

// Every lesson that starts (or, moved, starts) in [from, to), sorted by time. Cancelled ones
// are included (marked), so the calendar can show them struck through.
export function occurrences(slots: Slot[], changes: SlotChange[], from: Date, to: Date): Occurrence[] {
  const byKey = new Map(changes.map((c) => [`${c.slot_id}:${new Date(c.occurs_at).getTime()}`, c]));
  const moved = new Map<string, SlotChange[]>();
  for (const c of changes) if (c.moved_to) moved.set(c.slot_id, [...(moved.get(c.slot_id) ?? []), c]);
  const out: Occurrence[] = [];
  const f = from.getTime();
  const t = to.getTime();

  for (const slot of slots) {
    const first = new Date(slot.starts_at).getTime();
    if (Number.isNaN(first)) continue;
    const add = (original: Date) => {
      const key = `${slot.id}:${original.getTime()}`;
      const c = byKey.get(key);
      const start = c?.moved_to ? new Date(c.moved_to) : original;
      const minutes = c?.moved_minutes ?? slot.minutes;
      if (start.getTime() + minutes * 60_000 <= f || start.getTime() >= t) return;
      out.push({
        key,
        slotId: slot.id,
        lessonId: slot.lesson_id,
        start,
        minutes,
        original,
        weekly: slot.weekly,
        cancelled: Boolean(c?.cancelled),
        moved: Boolean(c?.moved_to),
      });
    };
    const inSeries = (d: Date) => !slot.ends_on || dayIn(d, slot.time_zone) <= slot.ends_on;

    if (!slot.weekly) {
      add(new Date(first));
      continue;
    }
    // Weekly: from the week before `from` (a lesson running over midnight) to `to`. A lesson
    // moved far from its week is found through its change, below.
    const startN = Math.max(0, Math.floor((f - first) / WEEK_MS) - 1);
    for (let n = startN; ; n++) {
      const d = nth(slot, n);
      if (d.getTime() >= t + DAY_MS || !inSeries(d)) break;
      if (!moved.get(slot.id)?.some((c) => new Date(c.occurs_at).getTime() === d.getTime())) add(d);
      if (n - startN > 600) break; // a guard; a year has 53 weeks
    }
    for (const c of moved.get(slot.id) ?? []) {
      const original = new Date(c.occurs_at);
      if (inSeries(original)) add(original);
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// The next lessons of one Classroom (not cancelled, not over), at most `count`.
export function nextOf(slots: Slot[], changes: SlotChange[], now: Date, count = 3, days = 120) {
  return occurrences(slots, changes, now, new Date(now.getTime() + days * DAY_MS))
    .filter((o) => !o.cancelled && o.start.getTime() + o.minutes * 60_000 > now.getTime())
    .slice(0, count);
}

// The week (Monday 00:00 local) that contains `d`, in the browser's zone.
export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Start lesson is offered from 15 minutes before until the end.
export const START_EARLY_MS = 15 * 60_000;
export const isStartable = (o: Occurrence, now: number) =>
  !o.cancelled && now >= o.start.getTime() - START_EARLY_MS && now < o.start.getTime() + o.minutes * 60_000;

export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// The calendar feed (RFC 5545): every planned lesson of a teacher, weekly ones as RRULEs with
// their zone's local time kept (TZID + EXDATE for cancelled ones, an extra event for a moved
// one). `title(lessonId)` names the event.
export function icsFeed(
  slots: Slot[],
  changes: SlotChange[],
  title: (lessonId: string) => string,
  url: (lessonId: string) => string,
  calName: string,
) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const local = (d: Date, zone: string) => {
    const p = partsIn(d, zone);
    const two = (n: number) => String(n).padStart(2, "0");
    return `${p.y}${two(p.m)}${two(p.d)}T${two(p.h)}${two(p.min)}00`;
  };
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TeachingTime//Lessons//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const event = (uid: string, lessonId: string, extra: string[]) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@teachingtime.app`,
      `DTSTAMP:${now}`,
      ...extra,
      `SUMMARY:${esc(title(lessonId))}`,
      `URL:${url(lessonId)}`,
      `LOCATION:${url(lessonId)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(title(lessonId))}`,
      "END:VALARM",
      "END:VEVENT",
    );
  };
  for (const s of slots) {
    const zone = safeZone(s.time_zone);
    const start = new Date(s.starts_at);
    const mine = changes.filter((c) => c.slot_id === s.id);
    if (!s.weekly) {
      const c = mine[0];
      if (c?.cancelled) continue;
      const at = c?.moved_to ? new Date(c.moved_to) : start;
      const min = c?.moved_minutes ?? s.minutes;
      event(s.id, s.lesson_id, [`DTSTART:${stamp(at)}`, `DTEND:${stamp(new Date(at.getTime() + min * 60_000))}`]);
      continue;
    }
    const until = s.ends_on ? `;UNTIL=${s.ends_on.replace(/-/g, "")}T235959Z` : "";
    const ex = mine.map((c) => `EXDATE;TZID=${zone}:${local(new Date(c.occurs_at), zone)}`);
    event(s.id, s.lesson_id, [
      `DTSTART;TZID=${zone}:${local(start, zone)}`,
      `DTEND;TZID=${zone}:${local(new Date(start.getTime() + s.minutes * 60_000), zone)}`,
      `RRULE:FREQ=WEEKLY${until}`,
      ...ex,
    ]);
    for (const c of mine) {
      if (c.cancelled || !c.moved_to) continue;
      const at = new Date(c.moved_to);
      const min = c.moved_minutes ?? s.minutes;
      event(`${s.id}-${new Date(c.occurs_at).getTime()}`, s.lesson_id, [
        `DTSTART:${stamp(at)}`,
        `DTEND:${stamp(new Date(at.getTime() + min * 60_000))}`,
      ]);
    }
  }
  lines.push("END:VCALENDAR");
  // Lines longer than 75 octets are folded (RFC 5545 3.1).
  return lines.map((l) => (l.length > 74 ? l.match(/.{1,73}/g)!.join("\r\n ") : l)).join("\r\n") + "\r\n";
}
