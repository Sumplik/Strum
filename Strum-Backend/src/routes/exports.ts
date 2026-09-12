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
} from "../services/export/reports";
import { summarizeBranch } from "../services/summary";
import { csvDelimiter, csvDelimiterSchema, exportFormatSchema, parseDateRange, ymdSchema } from "./shared";

const exportQuerySchema = t.Object({
  format: exportFormatSchema,
  start: ymdSchema,
  end: ymdSchema,
  delimiter: csvDelimiterSchema,
});

function fileResponse(body: Uint8Array | ReadableStream<Uint8Array>, format: ExportFormat, filename: string): Response {
  return new Response(body as Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function logsExport(branchId: string, code: string | undefined, query: typeof exportQuerySchema.static) {
  const branch = await requireBranch(branchId);
  const device = code ? await requireDevice(branch.id, code) : undefined;
  const range = parseDateRange(query.start, query.end, MAX_EXPORT_RANGE_DAYS);
  const scope = { branch, device, start: range.start, end: range.end };
  const filename = exportFilename("logs", scope, query.format);

  if (query.format === "csv") {
    return fileResponse(exportLogsCsv(scope, csvDelimiter(query.delimiter)), "csv", filename);
  }
  return fileResponse(await exportLogsXlsx(scope), "xlsx", filename);
}

export const exportRoutes = new Elysia({ prefix: "/branches/:branchId" })
  .get("/exports/logs", ({ params, query }) => logsExport(params.branchId, undefined, query), {
    query: exportQuerySchema,
  })

  .get("/devices/:code/exports/logs", ({ params, query }) => logsExport(params.branchId, params.code, query), {
    query: exportQuerySchema,
  })

  .get(
    "/exports/summary",
    async ({ params, query }) => {
      const branch = await requireBranch(params.branchId);
      const range = parseDateRange(query.start, query.end, MAX_SUMMARY_RANGE_DAYS);
      const report = await summarizeBranch(branch, range.start, range.end);
      const scope = { branch, start: range.start, end: range.end };
      const filename = exportFilename("summary", scope, query.format);

      if (query.format === "csv") {
        return fileResponse(exportSummaryCsv(branch.id, report.devices, csvDelimiter(query.delimiter)), "csv", filename);
      }
      return fileResponse(exportSummaryXlsx(branch.id, report.devices), "xlsx", filename);
    },
    { query: exportQuerySchema },
  );
