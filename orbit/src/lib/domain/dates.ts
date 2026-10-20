import type { DateOnly } from "./types";

const DAY_MS = 86_400_000;

/** Local calendar date for a moment, as YYYY-MM-DD. */
export function toDateOnly(d: Date): DateOnly {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateOnly(d: DateOnly): number {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: DateOnly, days: number): DateOnly {
  const t = new Date(parseDateOnly(d) + days * DAY_MS);
  return t.toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateOnly, to: DateOnly): number {
  return Math.round((parseDateOnly(to) - parseDateOnly(from)) / DAY_MS);
}

export function isDateOnly(s: unknown): s is DateOnly {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthDayYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Oct 23" (adds the year when it differs from `today`'s). */
export function formatDate(d: DateOnly, today?: DateOnly): string {
  const t = new Date(parseDateOnly(d));
  if (today && d.slice(0, 4) !== today.slice(0, 4)) return monthDayYear.format(t);
  return monthDay.format(t);
}

/** "today", "tomorrow", "in 3 days", "2 days ago". */
export function relativeDays(d: DateOnly, today: DateOnly): string {
  const n = daysBetween(today, d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

/** Relative age of a timestamp, for "Verified 2 days ago". */
export function ago(ts: string, today: DateOnly): string {
  const n = daysBetween(ts.slice(0, 10), today);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 45) return `${n} days ago`;
  return `on ${formatDate(ts.slice(0, 10), today)}`;
}
