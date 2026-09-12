import { config } from "../config";

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function wallClock(date: Date, timeZone = config.timezone): WallClock {
  const parts: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

// Converts a wall-clock time in the given zone to the corresponding instant.
export function fromWallClock(
  { year, month, day, hour = 0, minute = 0, second = 0, ms = 0 }: Partial<WallClock> & { year: number; month: number; day: number; ms?: number },
  timeZone = config.timezone,
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const seen = wallClock(new Date(guess), timeZone);
    const seenUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, seen.second, ms);
    const diff = seenUtc - target;
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess);
}

export function startOfDay(date: Date, timeZone = config.timezone): Date {
  const { year, month, day } = wallClock(date, timeZone);
  return fromWallClock({ year, month, day }, timeZone);
}

export function addDays(date: Date, days: number, timeZone = config.timezone): Date {
  const { year, month, day, hour, minute, second } = wallClock(date, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return fromWallClock(
    { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), hour, minute, second, ms: date.getTime() % 1000 },
    timeZone,
  );
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseYmd(value: string): { year: number; month: number; day: number } | null {
  const match = YMD.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  const valid = probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  return valid ? { year, month, day } : null;
}

// [00:00:00.000, 23:59:59.999] of a calendar day in the configured zone.
export function dayBounds(ymd: string, timeZone = config.timezone): { start: Date; end: Date } | null {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;
  const start = fromWallClock(parsed, timeZone);
  const nextDay = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
  const end = new Date(
    fromWallClock(
      { year: nextDay.getUTCFullYear(), month: nextDay.getUTCMonth() + 1, day: nextDay.getUTCDate() },
      timeZone,
    ).getTime() - 1,
  );
  return { start, end };
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHhmm(value: string): { hour: number; minute: number } | null {
  const match = HHMM.exec(value);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

export function formatYmd(date: Date, timeZone = config.timezone): string {
  const { year, month, day } = wallClock(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatLocal(date: Date, timeZone = config.timezone): string {
  const { year, month, day, hour, minute, second } = wallClock(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}
