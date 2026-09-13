import type { Device, DeviceLog, MachineStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { DISCONNECT_TIMEOUT_MS } from "../config";
import { badRequest, notFound } from "../lib/errors";
import { normalizeDeviceCode } from "./telemetry";

export type EffectiveStatus = MachineStatus | "disconnect";

export function isOnline(lastSeen: Date, now = new Date()): boolean {
  return now.getTime() - lastSeen.getTime() <= DISCONNECT_TIMEOUT_MS;
}

export function effectiveStatus(device: Pick<Device, "status" | "lastSeen">, now = new Date()): EffectiveStatus {
  return isOnline(device.lastSeen, now) ? device.status : "disconnect";
}

export function serializeDevice(device: Device, now = new Date()) {
  const online = isOnline(device.lastSeen, now);
  return {
    id: device.id,
    branchId: device.branchId,
    code: device.code,
    status: device.status,
    effectiveStatus: online ? device.status : ("disconnect" as const),
    online,
    reportedStatus: device.reportedStatus,
    lastSeen: device.lastSeen,
    location: device.location,
    ipAddress: device.ipAddress,
    firmwareVersion: device.firmwareVersion,
    threshold: device.threshold,
    arus: device.arus,
    voltase: device.voltase,
    suhu: device.suhu,
    kelembapan: device.kelembapan,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
  };
}

export function serializeLog(log: DeviceLog) {
  return {
    id: log.id,
    timestamp: log.timestamp,
    status: log.status,
    reportedStatus: log.reportedStatus,
    threshold: log.threshold,
    arus: log.arus,
    voltase: log.voltase,
    suhu: log.suhu,
    kelembapan: log.kelembapan,
    ipAddress: log.ipAddress,
  };
}

export interface DeviceFilter {
  status?: MachineStatus | "disconnect";
  search?: string;
}

async function queryDevices(scope: Prisma.DeviceWhereInput, filter: DeviceFilter, now: Date) {
  const search = filter.search?.trim();
  const rows = await prisma.device.findMany({
    where: {
      ...scope,
      ...(filter.status && filter.status !== "disconnect" ? { status: filter.status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { ipAddress: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ branchId: "asc" }, { code: "asc" }],
  });

  const devices = rows.map((row) => serializeDevice(row, now));
  if (filter.status === "disconnect") return devices.filter((d) => !d.online);
  if (filter.status) return devices.filter((d) => d.online);
  return devices;
}

export function listDevices(branchId: string, filter: DeviceFilter = {}, now = new Date()) {
  return queryDevices({ branchId }, filter, now);
}

// Every machine across all branches, ordered by branch then code.
export function listAllDevices(filter: DeviceFilter = {}, now = new Date()) {
  return queryDevices({}, filter, now);
}

export async function requireDevice(branchId: string, rawCode: string): Promise<Device> {
  const code = normalizeDeviceCode(rawCode);
  const device = code
    ? await prisma.device.findUnique({ where: { branchId_code: { branchId, code } } })
    : null;
  if (!device) throw notFound(`Mesin ${rawCode} tidak ditemukan di cabang ${branchId}`);
  return device;
}

export interface LogQuery {
  start?: Date;
  end?: Date;
  before?: Date;
  limit: number;
}

export async function listDeviceLogs(deviceId: string, query: LogQuery) {
  if (query.start && query.end && query.end < query.start) {
    throw badRequest("Parameter end harus setelah start");
  }

  const rows = await prisma.deviceLog.findMany({
    where: {
      deviceId,
      timestamp: {
        ...(query.start ? { gte: query.start } : {}),
        ...(query.end ? { lte: query.end } : {}),
        ...(query.before ? { lt: query.before } : {}),
      },
    },
    orderBy: { timestamp: "desc" },
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    logs: page.map(serializeLog),
    nextBefore: hasMore ? page[page.length - 1].timestamp : null,
  };
}

export async function deleteDevice(device: Device): Promise<{ deletedLogs: number }> {
  const deletedLogs = await prisma.deviceLog.count({ where: { deviceId: device.id } });
  await prisma.device.delete({ where: { id: device.id } });
  return { deletedLogs };
}
