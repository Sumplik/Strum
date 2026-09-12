import type { Branch } from "@prisma/client";
import { prisma } from "../db";
import { conflict, notFound } from "../lib/errors";
import { normalizeBranchId } from "./telemetry";

const CACHE_TTL_MS = 60_000;

let knownIds = new Set<string>();
let cacheLoadedAt = 0;

export async function refreshBranchCache(): Promise<Set<string>> {
  const rows = await prisma.branch.findMany({ select: { id: true } });
  knownIds = new Set(rows.map((row) => row.id));
  cacheLoadedAt = Date.now();
  return knownIds;
}

export async function getKnownBranches(): Promise<ReadonlySet<string>> {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    try {
      await refreshBranchCache();
    } catch (error) {
      console.error("❌ Gagal memuat daftar cabang:", error);
    }
  }
  return knownIds;
}

export function serializeBranch(branch: Branch & { _count?: { devices: number } }) {
  return {
    id: branch.id,
    name: branch.name,
    operationalHours: { start: branch.opsStart, end: branch.opsEnd },
    deviceCount: branch._count?.devices,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}

export async function listBranches() {
  const rows = await prisma.branch.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { devices: true } } },
  });
  return rows.map(serializeBranch);
}

export async function requireBranch(rawId: string): Promise<Branch> {
  const id = normalizeBranchId(rawId);
  const branch = id ? await prisma.branch.findUnique({ where: { id } }) : null;
  if (!branch) throw notFound(`Cabang ${rawId} tidak ditemukan`);
  return branch;
}

export async function createBranch(input: { id: string; name?: string; operationalHours?: { start: string; end: string } }) {
  const id = normalizeBranchId(input.id);
  if (!id) throw conflict(`ID cabang tidak valid: ${input.id}`);
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (existing) throw conflict(`Cabang ${id} sudah ada`);

  const branch = await prisma.branch.create({
    data: {
      id,
      name: input.name?.trim() || id,
      opsStart: input.operationalHours?.start,
      opsEnd: input.operationalHours?.end,
    },
    include: { _count: { select: { devices: true } } },
  });
  await refreshBranchCache();
  return serializeBranch(branch);
}

export async function updateBranch(
  branch: Branch,
  input: { name?: string; operationalHours?: { start: string; end: string } },
) {
  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: {
      name: input.name?.trim() || undefined,
      opsStart: input.operationalHours?.start,
      opsEnd: input.operationalHours?.end,
    },
    include: { _count: { select: { devices: true } } },
  });
  return serializeBranch(updated);
}

export async function deleteBranch(branch: Branch) {
  const deviceCount = await prisma.device.count({ where: { branchId: branch.id } });
  if (deviceCount > 0) {
    throw conflict(`Cabang ${branch.id} masih memiliki ${deviceCount} mesin; hapus mesinnya dulu`);
  }
  await prisma.branch.delete({ where: { id: branch.id } });
  await refreshBranchCache();
}
