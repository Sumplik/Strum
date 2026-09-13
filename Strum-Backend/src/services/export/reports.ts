import type { Branch, Device, DeviceLog } from "@prisma/client";
import { prisma } from "../../db";
import { MAX_XLSX_ROWS } from "../../config";
import { tooLarge } from "../../lib/errors";
import { formatLocal, formatYmd } from "../../lib/time";
import type { DeviceSummaryRow } from "../summary";
import { csvStream, type CellValue, type CsvDelimiter } from "./csv";
import { buildXlsx } from "./xlsx";

export type ExportFormat = "csv" | "xlsx";

const STATUS_LABELS: Record<string, string> = {
  on_duty: "On Duty",
  idle: "Idle",
  off: "OFF",
  disconnect: "Disconnect",
};

export const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;

const LOG_COLUMNS = [
  { header: "Waktu", width: 20 },
  { header: "Cabang", width: 10 },
  { header: "ID Mesin", width: 14 },
  { header: "Lokasi", width: 18 },
  { header: "Status", width: 10 },
  { header: "Status Dilaporkan", width: 16 },
  { header: "Arus (A)", width: 10 },
  { header: "Voltase (V)", width: 11 },
  { header: "Suhu (°C)", width: 10 },
  { header: "Kelembapan (%)", width: 14 },
  { header: "Threshold (A)", width: 13 },
  { header: "IP Address", width: 16 },
];

const SUMMARY_COLUMNS = [
  { header: "Cabang", width: 10 },
  { header: "ID Mesin", width: 14 },
  { header: "Lokasi", width: 18 },
  { header: "Jam On Duty", width: 12 },
  { header: "Jam Idle", width: 10 },
  { header: "Jam ON (total)", width: 14 },
  { header: "Jam OFF", width: 10 },
  { header: "Jam Disconnect", width: 14 },
  { header: "Jam Operasional", width: 15 },
  { header: "Availability (%)", width: 15 },
];

type LogRow = Pick<
  DeviceLog,
  "branchId" | "timestamp" | "status" | "reportedStatus" | "arus" | "voltase" | "suhu" | "kelembapan" | "threshold" | "ipAddress"
> & {
  device: Pick<Device, "code" | "location">;
};

function logToCells(log: LogRow): CellValue[] {
  return [
    formatLocal(log.timestamp),
    log.branchId,
    log.device.code,
    log.device.location,
    statusLabel(log.status),
    log.reportedStatus,
    log.arus,
    log.voltase,
    log.suhu,
    log.kelembapan,
    log.threshold,
    log.ipAddress,
  ];
}

// What an export covers: every branch, one branch, or one machine of a branch.
export interface ExportScope {
  branch?: Branch;
  device?: Device;
  start: Date;
  end: Date;
}

const ALL_BRANCHES_TARGET = "SEMUA-CABANG";

function scopeTarget(scope: ExportScope): string {
  if (scope.branch && scope.device) return `${scope.branch.id}_${scope.device.code}`;
  return scope.branch?.id ?? ALL_BRANCHES_TARGET;
}

// "Log UP2W1_6CNC1", "Summary Semua Cabang", ...
export function sheetName(kind: "Log" | "Summary", scope: ExportScope): string {
  if (scope.device) return `${kind} ${scope.device.code}`;
  return `${kind} ${scope.branch?.id ?? "Semua Cabang"}`;
}

function logWhere(scope: ExportScope) {
  return {
    ...(scope.branch ? { branchId: scope.branch.id } : {}),
    ...(scope.device ? { deviceId: scope.device.id } : {}),
    timestamp: { gte: scope.start, lte: scope.end },
  };
}

const BATCH_SIZE = 5000;

// Keyset pagination over (timestamp, id) so exports never load the whole range at once.
async function* iterateLogs(scope: ExportScope): AsyncGenerator<LogRow> {
  let cursor: { timestamp: Date; id: string } | null = null;

  while (true) {
    const batch: (LogRow & { id: string })[] = await prisma.deviceLog.findMany({
      where: {
        ...logWhere(scope),
        ...(cursor
          ? {
              OR: [
                { timestamp: { gt: cursor.timestamp } },
                { timestamp: cursor.timestamp, id: { gt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      take: BATCH_SIZE,
      select: {
        id: true,
        branchId: true,
        timestamp: true,
        status: true,
        reportedStatus: true,
        arus: true,
        voltase: true,
        suhu: true,
        kelembapan: true,
        threshold: true,
        ipAddress: true,
        device: { select: { code: true, location: true } },
      },
    });

    for (const row of batch) yield row;
    if (batch.length < BATCH_SIZE) return;
    const last = batch[batch.length - 1];
    cursor = { timestamp: last.timestamp, id: last.id };
  }
}

export function exportFilename(kind: "logs" | "summary", scope: ExportScope, format: ExportFormat): string {
  return `strum-${kind}-${scopeTarget(scope)}-${formatYmd(scope.start)}_${formatYmd(scope.end)}.${format}`;
}

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function exportLogsCsv(scope: ExportScope, delimiter: CsvDelimiter): ReadableStream<Uint8Array> {
  const rows = (async function* () {
    for await (const log of iterateLogs(scope)) yield logToCells(log);
  })();
  return csvStream(LOG_COLUMNS.map((c) => c.header), rows, delimiter);
}

export async function exportLogsXlsx(scope: ExportScope): Promise<Uint8Array> {
  const count = await prisma.deviceLog.count({ where: logWhere(scope) });
  if (count > MAX_XLSX_ROWS) {
    throw tooLarge(
      `Rentang ini berisi ${count} baris, melebihi batas ${MAX_XLSX_ROWS} untuk Excel. Persempit rentang tanggal atau gunakan format CSV.`,
    );
  }

  const rows: CellValue[][] = [];
  for await (const log of iterateLogs(scope)) rows.push(logToCells(log));

  return buildXlsx([{ name: sheetName("Log", scope), columns: LOG_COLUMNS, rows }]);
}

function summaryToCells(row: DeviceSummaryRow): CellValue[] {
  return [
    row.device.branchId,
    row.device.code,
    row.device.location,
    row.summary.onDutyHours,
    row.summary.idleHours,
    row.summary.onTotalHours,
    row.summary.offHours,
    row.summary.disconnectHours,
    row.summary.totalOperationalHours,
    row.summary.availabilityPercent,
  ];
}

export function exportSummaryCsv(rows: DeviceSummaryRow[], delimiter: CsvDelimiter) {
  return csvStream(SUMMARY_COLUMNS.map((c) => c.header), rows.map(summaryToCells), delimiter);
}

export function exportSummaryXlsx(rows: DeviceSummaryRow[], scope: ExportScope): Uint8Array {
  return buildXlsx([{ name: sheetName("Summary", scope), columns: SUMMARY_COLUMNS, rows: rows.map(summaryToCells) }]);
}
