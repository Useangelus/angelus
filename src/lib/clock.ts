// New York exchange clock: sessions, holidays, the 04:00 ET lock and the 09:30 ET bell.
// Pure functions, safe on server and client.

const HOLIDAYS = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19",
  "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18",
  "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);
const EARLY_CLOSE = new Set(["2026-11-27", "2026-12-24", "2027-11-26"]);

export const LOCK_HOUR = 4; // calls and agent numbers lock at 04:00 ET
export const OPEN_MIN = 9 * 60 + 30;

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short",
});

export interface NyParts { date: string; y: number; m: number; d: number; h: number; mi: number; s: number; wd: number }

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function ny(t: Date | number): NyParts {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  const y = +parts.year, m = +parts.month, d = +parts.day;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, y, m, d, h: +parts.hour, mi: +parts.minute, s: +parts.second, wd: WD[parts.weekday] };
}

/** UTC instant for a wall-clock time in New York. */
export function nyTime(date: string, h: number, mi = 0): Date {
  const [y, m, d] = date.split("-").map(Number);
  for (const off of [4, 5]) {
    const t = new Date(Date.UTC(y, m - 1, d, h + off, mi));
    const p = ny(t);
    if (p.date === date && p.h === h && p.mi === mi) return t;
  }
  return new Date(Date.UTC(y, m - 1, d, h + 5, mi));
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function isTradingDay(date: string): boolean {
  const wd = new Date(date + "T12:00:00Z").getUTCDay();
  return wd !== 0 && wd !== 6 && !HOLIDAYS.has(date);
}

export function closeMinutes(date: string): number {
  return EARLY_CLOSE.has(date) ? 13 * 60 : 16 * 60;
}

export function nextTradingDay(date: string): string {
  let d = addDays(date, 1);
  while (!isTradingDay(d)) d = addDays(d, 1);
  return d;
}

export function prevTradingDay(date: string): string {
  let d = addDays(date, -1);
  while (!isTradingDay(d)) d = addDays(d, -1);
  return d;
}

export type Phase = "regular" | "night";

export interface ClockState {
  now: number;
  phase: Phase;
  /** Session whose opening bell is the target (the next open, or today's if trading now). */
  session: string;
  /** The trading day whose close is the reference price. */
  refDay: string;
  openAt: number;
  lockAt: number;
  closeAt: number;
  /** Calls are accepted between the closing bell and the 04:00 ET lock. */
  callsOpen: boolean;
  locked: boolean;
}

export function clock(t: number = Date.now()): ClockState {
  const p = ny(t);
  const mins = p.h * 60 + p.mi;
  const today = p.date;
  if (isTradingDay(today) && mins >= OPEN_MIN && mins < closeMinutes(today)) {
    return {
      now: t, phase: "regular", session: today, refDay: prevTradingDay(today),
      openAt: +nyTime(today, 9, 30), lockAt: +nyTime(today, LOCK_HOUR), closeAt: +nyTime(today, 0, closeMinutes(today)),
      callsOpen: false, locked: true,
    };
  }
  const session = isTradingDay(today) && mins < OPEN_MIN ? today : nextTradingDay(today);
  const refDay = prevTradingDay(session);
  const openAt = +nyTime(session, 9, 30);
  const lockAt = +nyTime(session, LOCK_HOUR);
  const closeAt = +nyTime(refDay, 0, closeMinutes(refDay));
  const locked = t >= lockAt;
  return { now: t, phase: "night", session, refDay, openAt, lockAt, closeAt, callsOpen: !locked, locked };
}

export function span(ms: number): string {
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return `${d}d ${h}h ${String(mm).padStart(2, "0")}m`;
  return `${h}h ${String(mm).padStart(2, "0")}m`;
}

export function dayLabel(date: string): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
