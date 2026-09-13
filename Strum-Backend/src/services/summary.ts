import type { Branch, Device, MachineStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { config, DISCONNECT_TIMEOUT_MS } from "../config";
import { fromWallClock, HOUR_MS, parseHhmm, startOfDay, wallClock } from "../lib/time";
import { serializeDevice } from "./devices";

type TimelineStatus = MachineStatus | "disconnect";

export interface TimelineLog {
  timestamp: Date;
  status: MachineStatus;
}

export interface OperationalHours {
  start: string;
  end: string;
}

export interface SummaryInput {
  logs: TimelineLog[];
  startDate: Date;
  endDate: Date;
  opsHours: OperationalHours;
  timeZone?: string;
}

export interface DeviceSummary {
  idleHours: number;
  onDutyHours: number;
  onTotalHours: number;
  offHours: number;
  disconnectHours: number;
  operationalOnHours: number;
  operationalIdleHours: number;
  operationalOffHours: number;
  operationalDisconnectHours: number;
  totalOperationalHours: number;
  availabilityPercent: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / HOUR_MS);
}

interface OperationalWindow {
  start: number;
  end: number;
}

const MAX_WINDOW_DAYS = 400;

// One [open, close) window per calendar day (in the zone) touched by [periodStart, periodEnd].
export function buildOperationalWindows(
  periodStart: Date,
  periodEnd: Date,
  opsHours: OperationalHours,
  timeZone = config.timezone,
): OperationalWindow[] {
  const open = parseHhmm(opsHours.start);
  const close = parseHhmm(opsHours.end);
  if (!open || !close || periodEnd <= periodStart) return [];

  const windows: OperationalWindow[] = [];
  let day = startOfDay(periodStart, timeZone);
  const lastDay = startOfDay(periodEnd, timeZone);

  while (day <= lastDay && windows.length < MAX_WINDOW_DAYS) {
    const { year, month, day: dayOfMonth } = wallClock(day, timeZone);
    windows.push({
      start: fromWallClock({ year, month, day: dayOfMonth, hour: open.hour, minute: open.minute }, timeZone).getTime(),
      end: fromWallClock({ year, month, day: dayOfMonth, hour: close.hour, minute: close.minute }, timeZone).getTime(),
    });
    day = fromWallClock({ year, month, day: dayOfMonth + 1 }, timeZone);
  }

  return windows;
}

export function overlapHours(start: Date, end: Date, windows: OperationalWindow[]): number {
  let total = 0;
  const from = start.getTime();
  const to = end.getTime();
  for (const window of windows) {
    if (window.start >= to) break;
    if (window.end <= from) continue;
    total += Math.max(0, Math.min(to, window.end) - Math.max(from, window.start)) / HOUR_MS;
  }
  return total;
}

export function computeSummary({ logs, startDate, endDate, opsHours, timeZone = config.timezone }: SummaryInput): DeviceSummary {
  const windows = buildOperationalWindows(startDate, endDate, opsHours, timeZone);
  const raw: Record<TimelineStatus, number> = { idle: 0, on_duty: 0, off: 0, disconnect: 0 };
  const operational: Record<TimelineStatus, number> = { idle: 0, on_duty: 0, off: 0, disconnect: 0 };

  function addDuration(status: TimelineStatus, start: Date, end: Date) {
    if (!(status in raw)) return;

    const clampedStart = start < startDate ? startDate : start;
    const clampedEnd = end > endDate ? endDate : end;

    const hours = hoursBetween(clampedStart, clampedEnd);
    if (hours <= 0) return;

    raw[status] += hours;
    operational[status] += overlapHours(clampedStart, clampedEnd, windows);
  }

  logs.forEach((log, index) => {
    const cutoff = new Date(log.timestamp.getTime() + DISCONNECT_TIMEOUT_MS);
    const next = logs[index + 1];

    if (next) {
      if (next.timestamp <= cutoff) {
        addDuration(log.status, log.timestamp, next.timestamp);
      } else {
        addDuration(log.status, log.timestamp, cutoff);
        addDuration("disconnect", cutoff, next.timestamp);
      }
      return;
    }

    addDuration(log.status, log.timestamp, cutoff < endDate ? cutoff : endDate);
    if (endDate > cutoff) addDuration("disconnect", cutoff, endDate);
  });

  const totalOperational = overlapHours(startDate, endDate, windows);
  const operationalOn = operational.on_duty + operational.idle;
  const availability = totalOperational > 0 ? (operationalOn / totalOperational) * 100 : 0;

  return {
    idleHours: round2(raw.idle),
    onDutyHours: round2(raw.on_duty),
    onTotalHours: round2(raw.idle + raw.on_duty),
    offHours: round2(raw.off),
    disconnectHours: round2(raw.disconnect),
    operationalOnHours: round2(operationalOn),
    operationalIdleHours: round2(operational.idle),
    operationalOffHours: round2(operational.off),
    operationalDisconnectHours: round2(operational.disconnect),
    totalOperationalHours: round2(totalOperational),
    availabilityPercent: round2(Math.max(0, Math.min(100, availability))),
  };
}

interface BoundaryLog {
  deviceId: string;
  timestamp: Date;
  status: MachineStatus;
}

export interface DeviceSummaryRow {
  device: ReturnType<typeof serializeDevice>;
  summary: DeviceSummary;
}

export interface SummaryReport {
  branchId: string;
  range: { start: Date; end: Date; effectiveEnd: Date };
  operationalHours: OperationalHours;
  devices: DeviceSummaryRow[];
  averageAvailabilityPercent: number;
}

async function boundaryLogs(branchId: string, edge: "before" | "after", at: Date, deviceIds?: string[]) {
  const deviceFilter = deviceIds ? Prisma.sql`AND "deviceId" IN (${Prisma.join(deviceIds)})` : Prisma.empty;
  return edge === "before"
    ? prisma.$queryRaw<BoundaryLog[]>`
        SELECT DISTINCT ON ("deviceId") "deviceId", "timestamp", "status"
        FROM "DeviceLog"
        WHERE "branchId" = ${branchId} AND "timestamp" < ${at} ${deviceFilter}
        ORDER BY "deviceId", "timestamp" DESC`
    : prisma.$queryRaw<BoundaryLog[]>`
        SELECT DISTINCT ON ("deviceId") "deviceId", "timestamp", "status"
        FROM "DeviceLog"
        WHERE "branchId" = ${branchId} AND "timestamp" > ${at} ${deviceFilter}
        ORDER BY "deviceId", "timestamp" ASC`;
}

export async function summarizeDevices(
  branch: Branch,
  devices: Device[],
  start: Date,
  end: Date,
  now = new Date(),
): Promise<SummaryReport> {
  const effectiveEnd = end > now ? now : end;
  const opsHours = { start: branch.opsStart, end: branch.opsEnd };
  const deviceIds = devices.map((d) => d.id);
  const scoped = deviceIds.length === 1 ? deviceIds : undefined;

  const [previous, inRange, following] = deviceIds.length
    ? await Promise.all([
        boundaryLogs(branch.id, "before", start, scoped),
        prisma.deviceLog.findMany({
          where: {
            branchId: branch.id,
            ...(scoped ? { deviceId: scoped[0] } : {}),
            timestamp: { gte: start, lte: effectiveEnd },
          },
          select: { deviceId: true, timestamp: true, status: true },
          orderBy: [{ deviceId: "asc" }, { timestamp: "asc" }],
        }),
        boundaryLogs(branch.id, "after", effectiveEnd, scoped),
      ])
    : [[], [], []];

  const byDevice = new Map<string, TimelineLog[]>();
  const push = (log: BoundaryLog) => {
    const list = byDevice.get(log.deviceId) ?? [];
    list.push({ timestamp: log.timestamp, status: log.status });
    byDevice.set(log.deviceId, list);
  };
  previous.forEach(push);
  inRange.forEach(push);
  following.forEach(push);

  const rows = devices.map((device) => ({
    device: serializeDevice(device, now),
    summary: computeSummary({
      logs: byDevice.get(device.id) ?? [],
      startDate: start,
      endDate: effectiveEnd,
      opsHours,
    }),
  }));

  const average = rows.length
    ? rows.reduce((acc, row) => acc + row.summary.availabilityPercent, 0) / rows.length
    : 0;

  return {
    branchId: branch.id,
    range: { start, end, effectiveEnd },
    operationalHours: opsHours,
    devices: rows,
    averageAvailabilityPercent: round2(average),
  };
}

export async function summarizeBranch(branch: Branch, start: Date, end: Date, now = new Date()) {
  const devices = await prisma.device.findMany({ where: { branchId: branch.id }, orderBy: { code: "asc" } });
  return summarizeDevices(branch, devices, start, end, now);
}

export interface BranchSummaryInfo {
  branchId: string;
  operationalHours: OperationalHours;
  averageAvailabilityPercent: number;
}

export interface MultiBranchSummaryReport {
  range: { start: Date; end: Date; effectiveEnd: Date };
  branches: BranchSummaryInfo[];
  // Every machine across all branches, ordered by branch then code.
  devices: DeviceSummaryRow[];
  averageAvailabilityPercent: number;
}

// All machines in every branch; operational hours are applied per branch.
export async function summarizeAllBranches(start: Date, end: Date, now = new Date()): Promise<MultiBranchSummaryReport> {
  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });
  const reports = await Promise.all(branches.map((branch) => summarizeBranch(branch, start, end, now)));
  const devices = reports.flatMap((report) => report.devices);
  const average = devices.length
    ? devices.reduce((acc, row) => acc + row.summary.availabilityPercent, 0) / devices.length
    : 0;

  return {
    range: { start, end, effectiveEnd: end > now ? now : end },
    branches: reports.map(({ branchId, operationalHours, averageAvailabilityPercent }) => ({
      branchId,
      operationalHours,
      averageAvailabilityPercent,
    })),
    devices,
    averageAvailabilityPercent: round2(average),
  };
}
