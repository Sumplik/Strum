import { prisma } from "../db";
import { config } from "../config";
import { getKnownBranches } from "./branches";
import { deriveStatus, normalizeTelemetry, type RejectReason, type Telemetry } from "./telemetry";

const MAX_PAYLOAD_BYTES = 16 * 1024;

export type IngestRejectReason = RejectReason | "payload_too_large" | "json_invalid";

export type IngestOutcome =
  | { status: "stored"; branchId: string; code: string; warnings: string[] }
  | { status: "duplicate"; branchId: string; code: string }
  | { status: "rejected"; reason: IngestRejectReason; message: string };

export const ingestionStats = {
  received: 0,
  stored: 0,
  duplicates: 0,
  rejected: 0,
  legacyTopic: 0,
  legacyBranchId: config.mqtt.legacyBranchId,
  rejectedByReason: {} as Record<string, number>,
  lastMessageAt: null as Date | null,
  lastStoredAt: null as Date | null,
  lastRejection: null as string | null,
};

const announcedLegacyDevices = new Set<string>();

function reject(reason: IngestRejectReason, message: string): IngestOutcome {
  ingestionStats.rejected += 1;
  ingestionStats.rejectedByReason[reason] = (ingestionStats.rejectedByReason[reason] ?? 0) + 1;
  ingestionStats.lastRejection = message;
  return { status: "rejected", reason, message };
}

export async function persistTelemetry(t: Telemetry): Promise<IngestOutcome> {
  const existing = await prisma.device.findUnique({
    where: { branchId_code: { branchId: t.branchId, code: t.code } },
    select: { id: true, threshold: true, lastSeen: true },
  });

  const threshold = t.threshold ?? existing?.threshold ?? null;
  const status = deriveStatus(t.isReportedOff, t.arus, threshold);
  const measurements = {
    reportedStatus: t.reportedStatus,
    threshold,
    arus: t.arus,
    voltase: t.voltase,
    suhu: t.suhu,
    kelembapan: t.kelembapan,
    ipAddress: t.ipAddress,
  };

  const insertedCount = await prisma.$transaction(async (tx) => {
    let deviceId = existing?.id;

    if (!existing) {
      const created = await tx.device.create({
        data: {
          branchId: t.branchId,
          code: t.code,
          status,
          lastSeen: t.timestamp,
          location: t.location,
          firmwareVersion: t.firmwareVersion,
          ...measurements,
        },
        select: { id: true },
      });
      deviceId = created.id;
    } else if (t.timestamp >= existing.lastSeen) {
      // Out-of-order messages are still logged but must not roll the live state backwards.
      await tx.device.update({
        where: { id: existing.id },
        data: {
          status,
          lastSeen: t.timestamp,
          location: t.location ?? undefined,
          firmwareVersion: t.firmwareVersion ?? undefined,
          ...measurements,
        },
      });
    }

    const inserted = await tx.deviceLog.createMany({
      data: [{ deviceId: deviceId!, branchId: t.branchId, timestamp: t.timestamp, status, ...measurements }],
      skipDuplicates: true,
    });
    return inserted.count;
  });

  if (insertedCount === 0) {
    ingestionStats.duplicates += 1;
    return { status: "duplicate", branchId: t.branchId, code: t.code };
  }

  ingestionStats.stored += 1;
  ingestionStats.lastStoredAt = new Date();
  return { status: "stored", branchId: t.branchId, code: t.code, warnings: t.warnings };
}

export async function ingestMessage(topic: string, message: Uint8Array | string, now = new Date()): Promise<IngestOutcome> {
  ingestionStats.received += 1;
  ingestionStats.lastMessageAt = now;

  const raw = typeof message === "string" ? message : Buffer.from(message).toString("utf8");
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return reject("payload_too_large", `payload ${raw.length} byte melebihi batas ${MAX_PAYLOAD_BYTES}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return reject("json_invalid", `payload bukan JSON valid pada topic ${topic}`);
  }

  const normalized = normalizeTelemetry(topic, payload, { now, knownBranches: await getKnownBranches() });
  if (!normalized.ok) return reject(normalized.reason, normalized.message);

  if (normalized.value.topicKind === "legacy") {
    ingestionStats.legacyTopic += 1;
    const key = `${normalized.value.branchId}/${normalized.value.code}`;
    if (!announcedLegacyDevices.has(key)) {
      announcedLegacyDevices.add(key);
      console.warn(`ℹ️ Topic lama "${topic}" → mesin ${normalized.value.code} dicatat ke cabang ${normalized.value.branchId}`);
    }
  }

  return persistTelemetry(normalized.value);
}
