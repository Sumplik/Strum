import { Elysia, t } from "elysia";
import { MAX_EXPORT_RANGE_DAYS, MAX_SUMMARY_RANGE_DAYS } from "../config";
import { requireBranch } from "../services/branches";
import { requireDevice } from "../services/devices";
import {
  CONTENT_TYPES,
  exportFilename,
  exportLogsCsv,
  exportLogsXlsx,
  exportSummaryCsv,
  exportSummaryXlsx,
  type ExportFormat,
  type ExportScope,
} from "../services/export/reports";
import { summarizeAllBranches, summarizeBranch, type DeviceSummaryRow } from "../services/summary";
import { csvDelimiter, csvDelimiterSchema, exportFormatSchema, parseDateRange, ymdSchema } from "./shared";

const exportQuerySchema = t.Object({
  format: exportFormatSchema,
  start: ymdSchema,
  end: ymdSchema,
  delimiter: csvDelimiterSchema,
});

type ExportQuery = typeof exportQuerySchema.static;

function fileResponse(body: Uint8Array | ReadableStream<Uint8Array>, format: ExportFormat, filename: string): Response {
  return new Response(body as Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// Log telemetri: semua cabang (tanpa branchId), satu cabang, atau satu mesin (branchId + code).
async function logsExport(query: ExportQuery, branchId?: string, code?: string) {
  const branch = branchId ? await requireBranch(branchId) : undefined;
  const device = branch && code ? await requireDevice(branch.id, code) : undefined;
  const range = parseDateRange(query.start, query.end, MAX_EXPORT_RANGE_DAYS);
  const scope: ExportScope = { branch, device, start: range.start, end: range.end };
  const filename = exportFilename("logs", scope, query.format);

  if (query.format === "csv") {
    return fileResponse(exportLogsCsv(scope, csvDelimiter(query.delimiter)), "csv", filename);
  }
  return fileResponse(await exportLogsXlsx(scope), "xlsx", filename);
}

// Tabel availability per mesin: semua cabang (tanpa branchId) atau satu cabang.
async function summaryExport(query: ExportQuery, branchId?: string) {
  const range = parseDateRange(query.start, query.end, MAX_SUMMARY_RANGE_DAYS);
  const branch = branchId ? await requireBranch(branchId) : undefined;
  const rows: DeviceSummaryRow[] = branch
    ? (await summarizeBranch(branch, range.start, range.end)).devices
    : (await summarizeAllBranches(range.start, range.end)).devices;
  const scope: ExportScope = { branch, start: range.start, end: range.end };
  const filename = exportFilename("summary", scope, query.format);

  if (query.format === "csv") {
    return fileResponse(exportSummaryCsv(rows, csvDelimiter(query.delimiter)), "csv", filename);
  }
  return fileResponse(exportSummaryXlsx(rows, scope), "xlsx", filename);
}

export const exportRoutes = new Elysia({ prefix: "/branches/:branchId" })
  .get("/exports/logs", ({ params, query }) => logsExport(query, params.branchId), { query: exportQuerySchema })

  .get("/devices/:code/exports/logs", ({ params, query }) => logsExport(query, params.branchId, params.code), {
    query: exportQuerySchema,
  })

  .get("/exports/summary", ({ params, query }) => summaryExport(query, params.branchId), { query: exportQuerySchema });

// Export lintas cabang, dipakai dashboard saat filter "semua cabang".
export const crossBranchExportRoutes = new Elysia({ prefix: "/exports" })
  .get("/logs", ({ query }) => logsExport(query), { query: exportQuerySchema })
  .get("/summary", ({ query }) => summaryExport(query), { query: exportQuerySchema });
