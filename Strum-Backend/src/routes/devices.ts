import { Elysia, t } from "elysia";
import { MAX_SUMMARY_RANGE_DAYS } from "../config";
import { badRequest } from "../lib/errors";
import { requireBranch } from "../services/branches";
import {
  deleteDevice,
  listAllDevices,
  listDeviceLogs,
  listDevices,
  requireDevice,
  serializeDevice,
} from "../services/devices";
import { summarizeAllBranches, summarizeBranch, summarizeDevices } from "../services/summary";
import { parseDateRange, ymdSchema } from "./shared";

const statusFilterSchema = t.Optional(
  t.Union([t.Literal("on_duty"), t.Literal("idle"), t.Literal("off"), t.Literal("disconnect")]),
);

const deviceListQuerySchema = t.Object({
  status: statusFilterSchema,
  search: t.Optional(t.String({ maxLength: 100 })),
});

const rangeQuerySchema = t.Object({ start: ymdSchema, end: ymdSchema });

// Cross-branch views, used by the dashboard when the branch filter is "all".
export const crossBranchRoutes = new Elysia()
  .get(
    "/devices",
    async ({ query }) => ({ success: true, data: await listAllDevices({ status: query.status, search: query.search }) }),
    { query: deviceListQuerySchema },
  )

  .get(
    "/summary",
    async ({ query }) => {
      const range = parseDateRange(query.start, query.end, MAX_SUMMARY_RANGE_DAYS);
      return { success: true, data: await summarizeAllBranches(range.start, range.end) };
    },
    { query: rangeQuerySchema },
  );

function parseIsoDate(value: string | undefined, name: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest(`Parameter ${name} bukan tanggal valid`);
  return date;
}

export const deviceRoutes = new Elysia({ prefix: "/branches/:branchId" })
  .get(
    "/devices",
    async ({ params, query }) => {
      const branch = await requireBranch(params.branchId);
      return { success: true, data: await listDevices(branch.id, { status: query.status, search: query.search }) };
    },
    { query: deviceListQuerySchema },
  )

  .get(
    "/summary",
    async ({ params, query }) => {
      const branch = await requireBranch(params.branchId);
      const range = parseDateRange(query.start, query.end, MAX_SUMMARY_RANGE_DAYS);
      return { success: true, data: await summarizeBranch(branch, range.start, range.end) };
    },
    { query: rangeQuerySchema },
  )

  .get("/devices/:code", async ({ params }) => {
    const branch = await requireBranch(params.branchId);
    const device = await requireDevice(branch.id, params.code);
    return { success: true, data: serializeDevice(device) };
  })

  .delete("/devices/:code", async ({ params }) => {
    const branch = await requireBranch(params.branchId);
    const device = await requireDevice(branch.id, params.code);
    const result = await deleteDevice(device);
    return { success: true, message: `Mesin ${device.code} dan ${result.deletedLogs} log dihapus` };
  })

  .get(
    "/devices/:code/logs",
    async ({ params, query }) => {
      const branch = await requireBranch(params.branchId);
      const device = await requireDevice(branch.id, params.code);
      const result = await listDeviceLogs(device.id, {
        start: parseIsoDate(query.start, "start"),
        end: parseIsoDate(query.end, "end"),
        before: parseIsoDate(query.before, "before"),
        limit: query.limit ?? 200,
      });
      return { success: true, data: result.logs, meta: { nextBefore: result.nextBefore, limit: query.limit ?? 200 } };
    },
    {
      query: t.Object({
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
        before: t.Optional(t.String()),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 1000 })),
      }),
    },
  )

  .get(
    "/devices/:code/summary",
    async ({ params, query }) => {
      const branch = await requireBranch(params.branchId);
      const device = await requireDevice(branch.id, params.code);
      const range = parseDateRange(query.start, query.end, MAX_SUMMARY_RANGE_DAYS);
      const { devices, ...report } = await summarizeDevices(branch, [device], range.start, range.end);
      return { success: true, data: { ...report, device: devices[0] } };
    },
    { query: rangeQuerySchema },
  );
