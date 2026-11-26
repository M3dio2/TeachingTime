// Review A4: a Classroom's next lesson. Stored as a point in time (lessons.next_lesson_at) plus
// "every week" (lessons.repeats_weekly). A weekly lesson moves on by itself: once a lesson is
// more than LESSON_LENGTH past its start, the next week's is shown.

export const LESSON_MINUTES = 60;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const PAST_AFTER = LESSON_MINUTES * 60 * 1000;

// The next lesson to show, or null (none planned, or a one-off that is over).
export function upcoming(nextAt: string | null, weekly: boolean, now = Date.now()): Date | null {
  if (!nextAt) return null;
  let at = new Date(nextAt).getTime();
  if (Number.isNaN(at)) return null;
  if (at + PAST_AFTER > now) return new Date(at);
  if (!weekly) return null;
  const weeks = Math.ceil((now - PAST_AFTER - at) / WEEK);
  at += Math.max(1, weeks) * WEEK;
  return new Date(at);
}

// "2026-12-02T17:00" in the browser's time zone, for <input type="date"> and "time".
export function localParts(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// The inputs back to a point in time (the browser's time zone).
export function fromLocalParts(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "Tue, 2 Dec, 17:00" in the reader's language and time zone.
export function formatLesson(d: Date, locale: string, withZone = false) {
  return d.toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...(withZone ? { timeZoneName: "short" } : {}),
  });
}

// A calendar file (RFC 5545) for the lesson. UTC times, so every calendar shows it in its own
// time zone. Weekly lessons repeat.
export function icsFile({
  uid,
  title,
  start,
  url,
  weekly,
  description,
}: {
  uid: string;
  title: string;
  start: Date;
  url: string;
  weekly: boolean;
  description: string;
}) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const end = new Date(start.getTime() + LESSON_MINUTES * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TeachingTime//Lessons//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@teachingtime.app`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    ...(weekly ? ["RRULE:FREQ=WEEKLY"] : []),
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    `URL:${url}`,
    `LOCATION:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcs(name: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/[\\/:*?"<>|]/g, "")}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
