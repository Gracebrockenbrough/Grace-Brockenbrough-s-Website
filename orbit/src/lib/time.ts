/**
 * Small, dependency-free date helpers for local, timezone-free strings.
 *   date      "2026-10-09"
 *   time      "14:30"
 *   datetime  "2026-10-09T14:30"
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT };

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateTimeStr(d: Date): string {
  return `${toDateStr(d)}T${toTimeStr(d)}`;
}

export function parseDate(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

export function parseDateTime(dt: string): Date {
  const [date, time] = dt.split("T");
  return parseDate(date, time ?? "00:00");
}

export function datePart(dt: string): string {
  return dt.split("T")[0];
}

export function timePart(dt: string): string | undefined {
  return dt.split("T")[1];
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function addMinutesToTime(time: string, minutes: number): string {
  return fromMinutes(toMinutes(time) + minutes);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86_400_000);
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

export function weekday(date: string): number {
  return parseDate(date).getDay();
}

/** Monday-start week. */
export function startOfWeek(date: string): string {
  const day = weekday(date);
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: string, months: number): string {
  const d = parseDate(startOfMonth(date));
  d.setMonth(d.getMonth() + months);
  return toDateStr(d);
}

export function daysInRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${pad(m)} ${suffix}`;
}

/** "8:30 AM" style, always with minutes — used on timelines for alignment. */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

export function formatTimeRange(start?: string, end?: string): string {
  if (!start) return "All day";
  if (!end) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatLongDate(date: string): string {
  const d = parseDate(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatShortDate(date: string): string {
  const d = parseDate(date);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatMonthDay(date: string): string {
  const d = parseDate(date);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "finish your finance problem set" or "submit the housing form" — for sentences. */
export function actionPhrase(title: string): string {
  if (/^(Submit|Reply|Return|Send|Confirm|Schedule|Buy|Email|Ask|Call|Register|Read|Finish|Study|Review)\b/.test(title)) {
    return title.charAt(0).toLowerCase() + title.slice(1);
  }
  const t = /^[A-Z]{2,}/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);
  return `finish your ${t}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 hr" : `${h} hr`;
  return `${h} hr ${m} min`;
}

/** Natural relative day: "Today", "Tomorrow", "Monday", "Oct 21". */
export function relativeDay(date: string, today: string): string {
  const delta = diffDays(date, today);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta > 1 && delta < 7) return WEEKDAYS[weekday(date)];
  if (delta >= 7 && delta < 14 && weekday(date) !== 0) return `Next ${WEEKDAYS[weekday(date)]}`;
  return formatMonthDay(date);
}

/** "Due today at 5 PM", "Tomorrow", "Monday at 11:59 PM", "Oct 21". */
export function relativeDateTime(dt: string, today: string): string {
  const date = datePart(dt);
  const time = timePart(dt);
  const day = relativeDay(date, today);
  if (!time || time === "23:59") {
    if (time === "23:59" && day === "Today") return "Tonight";
    return day;
  }
  return `${day} at ${formatTime(time)}`;
}

export function relativePast(dt: string, now: Date): string {
  const then = parseDateTime(dt);
  const hours = hoursBetween(then, now);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`;
  const today = toDateStr(now);
  const date = datePart(dt);
  if (date === today) return `${Math.round(hours)} hr ago`;
  if (diffDays(today, date) === 1) return "Yesterday";
  return formatMonthDay(date);
}
