import type { MachineStatus } from "@prisma/client";
import { prisma } from "../db";
import { DISCONNECT_TIMEOUT_MS } from "../config";

export interface BranchStats {
  total: number;
  online: number;
  disconnect: number;
  on: number;
  onDuty: number;
  idle: number;
  off: number;
  percentOnDuty: number;
  percentIdle: number;
  percentOff: number;
}

const EMPTY_COUNTS: Record<MachineStatus, number> = { off: 0, idle: 0, on_duty: 0 };

function percent(part: number, whole: number): number {
  return whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0;
}

function buildStats(counts: Record<MachineStatus, number>, online: number): BranchStats {
  const total = counts.off + counts.idle + counts.on_duty;
  const on = counts.on_duty + counts.idle;
  return {
    total,
    online,
    disconnect: total - online,
    on,
    onDuty: counts.on_duty,
    idle: counts.idle,
    off: counts.off,
    percentOnDuty: percent(counts.on_duty, on),
    percentIdle: percent(counts.idle, on),
    percentOff: percent(counts.off, total),
  };
}

// Status counts include every registered machine; "online" is derived from lastSeen.
export async function getBranchStats(branchId: string, now = new Date()): Promise<BranchStats> {
  const disconnectThreshold = new Date(now.getTime() - DISCONNECT_TIMEOUT_MS);
  const [grouped, online] = await Promise.all([
    prisma.device.groupBy({ by: ["status"], where: { branchId }, _count: { _all: true } }),
    prisma.device.count({ where: { branchId, lastSeen: { gt: disconnectThreshold } } }),
  ]);

  const counts = { ...EMPTY_COUNTS };
  for (const row of grouped) counts[row.status] = row._count._all;
  return buildStats(counts, online);
}

export async function getAllBranchStats(now = new Date()): Promise<Map<string, BranchStats>> {
  const disconnectThreshold = new Date(now.getTime() - DISCONNECT_TIMEOUT_MS);
  const [grouped, onlineGrouped] = await Promise.all([
    prisma.device.groupBy({ by: ["branchId", "status"], _count: { _all: true } }),
    prisma.device.groupBy({
      by: ["branchId"],
      where: { lastSeen: { gt: disconnectThreshold } },
      _count: { _all: true },
    }),
  ]);

  const countsByBranch = new Map<string, Record<MachineStatus, number>>();
  for (const row of grouped) {
    const counts = countsByBranch.get(row.branchId) ?? { ...EMPTY_COUNTS };
    counts[row.status] = row._count._all;
    countsByBranch.set(row.branchId, counts);
  }
  const onlineByBranch = new Map(onlineGrouped.map((row) => [row.branchId, row._count._all]));

  const result = new Map<string, BranchStats>();
  for (const [branchId, counts] of countsByBranch) {
    result.set(branchId, buildStats(counts, onlineByBranch.get(branchId) ?? 0));
  }
  return result;
}

export function sumStats(all: Iterable<BranchStats>): BranchStats {
  const counts = { ...EMPTY_COUNTS };
  let online = 0;
  for (const stats of all) {
    counts.off += stats.off;
    counts.idle += stats.idle;
    counts.on_duty += stats.onDuty;
    online += stats.online;
  }
  return buildStats(counts, online);
}

export const EMPTY_STATS: BranchStats = buildStats(EMPTY_COUNTS, 0);
