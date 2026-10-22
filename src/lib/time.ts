// The tournament runs on Ulaanbaatar time (UTC+8, no DST). All dates are stored in UTC.
export const TOURNAMENT_TZ = "Asia/Ulaanbaatar";
const OFFSET = "+08:00";

/** "2026-10-23T18:30" (local tournament time, from <input type="datetime-local">) → Date */
export function parseLocalDateTime(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** "2026-10-23" (date input, tournament time) → Date at local midnight */
export function parseLocalDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parts(date: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOURNAMENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

/** Date → value for <input type="datetime-local"> in tournament time */
export function toLocalDateTimeInput(date: Date | undefined): string {
  if (!date) return "";
  const { y, m, d, h, min } = parts(date);
  return `${y}-${m}-${d}T${h}:${min}`;
}

/** Date → value for <input type="date"> in tournament time */
export function toLocalDateInput(date: Date | undefined): string {
  if (!date) return "";
  const { y, m, d } = parts(date);
  return `${y}-${m}-${d}`;
}

/** "10.23 18:30" — compact, unambiguous on small screens */
export function formatShortDateTime(date: Date): string {
  const { m, d, h, min } = parts(date);
  return `${m}.${d} ${h}:${min}`;
}

export function formatTime(date: Date): string {
  const { h, min } = parts(date);
  return `${h}:${min}`;
}

/** "2026.10.23" in tournament time; used as a stable day key too */
export function formatDate(date: Date): string {
  const { y, m, d } = parts(date);
  return `${y}.${m}.${d}`;
}

/** "2026-10-25" in tournament time — stable key for grouping by day */
export function dayKey(date: Date): string {
  const { y, m, d } = parts(date);
  return `${y}-${m}-${d}`;
}

const weekday = new Intl.DateTimeFormat("mn-MN", { weekday: "long", timeZone: TOURNAMENT_TZ });

/** "10-р сарын 25 · Ням" */
export function formatDayLabel(date: Date): string {
  const { m, d } = parts(date);
  const wd = weekday.format(date);
  return `${Number(m)}-р сарын ${Number(d)} · ${wd.charAt(0).toUpperCase()}${wd.slice(1)}`;
}

/** "2026.10.23 – 10.27" (or a single date) */
export function formatDateRange(start?: Date, end?: Date): string | undefined {
  if (!start) return undefined;
  if (!end || dayKey(start) === dayKey(end)) return formatDate(start);
  const s = parts(start);
  const e = parts(end);
  return s.y === e.y ? `${formatDate(start)} – ${e.m}.${e.d}` : `${formatDate(start)} – ${formatDate(end)}`;
}
