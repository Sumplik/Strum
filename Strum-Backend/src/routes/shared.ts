import { t } from "elysia";
import { badRequest } from "../lib/errors";
import { DAY_MS, dayBounds, parseHhmm } from "../lib/time";

export const ymdSchema = t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "YYYY-MM-DD" });
export const hhmmSchema = t.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", description: "HH:mm" });

export const operationalHoursSchema = t.Object({
  start: hhmmSchema,
  end: hhmmSchema,
});

export const exportFormatSchema = t.Union([t.Literal("csv"), t.Literal("xlsx")]);
export const csvDelimiterSchema = t.Optional(t.Union([t.Literal("comma"), t.Literal("semicolon")]));

export interface DateRange {
  start: Date;
  end: Date;
}

// Inclusive calendar-day range in the configured timezone, capped at maxDays.
export function parseDateRange(startYmd: string, endYmd: string, maxDays: number): DateRange {
  const start = dayBounds(startYmd);
  const end = dayBounds(endYmd);
  if (!start) throw badRequest(`Tanggal start tidak valid: ${startYmd}`);
  if (!end) throw badRequest(`Tanggal end tidak valid: ${endYmd}`);
  if (end.end < start.start) throw badRequest("Tanggal end harus sama atau setelah start");

  const days = Math.round((end.start.getTime() - start.start.getTime()) / DAY_MS) + 1;
  if (days > maxDays) throw badRequest(`Rentang maksimal ${maxDays} hari (diminta ${days} hari)`);

  return { start: start.start, end: end.end };
}

export function validateOperationalHours(hours: { start: string; end: string }) {
  const open = parseHhmm(hours.start);
  const close = parseHhmm(hours.end);
  if (!open || !close) throw badRequest("Format jam operasional harus HH:mm");
  if (close.hour * 60 + close.minute <= open.hour * 60 + open.minute) {
    throw badRequest("Jam selesai harus setelah jam mulai");
  }
}

export function csvDelimiter(value: "comma" | "semicolon" | undefined): "," | ";" {
  return value === "semicolon" ? ";" : ",";
}
