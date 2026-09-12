import { describe, expect, it } from "bun:test";
import {
  deriveStatus,
  normalizeBranchId,
  normalizeDeviceCode,
  normalizeIp,
  normalizeTelemetry,
  resolveTopic,
  sanitizeTimestamp,
  toNumber,
} from "./telemetry";

const now = new Date("2026-09-12T08:00:00.000Z");
const knownBranches = new Set(["UP2W1", "UP2W2", "UP2W3", "UP2W4", "UP2W5", "UP2W6"]);
const options = { now, knownBranches, legacyBranchId: "UP2W6" };
const normalize = (topic: string, payload: unknown) => normalizeTelemetry(topic, payload, options);

const payload = {
  device_id: "6CNC1",
  location: "Ruang CNC",
  version: "1.0",
  threshold: 22,
  data: { arus: 25.4, suhu: 38.2, voltase: 220.1, kelembapan: 70.5, status_mesin: "ON" },
};

describe("resolveTopic", () => {
  it("resolves registered branches, uppercasing and ignoring spaces", () => {
    expect(resolveTopic("mesin/telemetry/up2w3", knownBranches, "UP2W6")).toEqual({ ok: true, kind: "branch", branchId: "UP2W3" });
    expect(resolveTopic("mesin/telemetry/UP2W 1", knownBranches, "UP2W6")).toEqual({ ok: true, kind: "branch", branchId: "UP2W1" });
    expect(resolveTopic("mesin/telemetry/ up2w 2 /6CNC1", knownBranches, "UP2W6")).toEqual({ ok: true, kind: "branch", branchId: "UP2W2" });
  });

  it("routes legacy topics (device id or nothing after the root) to the legacy branch", () => {
    expect(resolveTopic("mesin/telemetry/6CNC1", knownBranches, "UP2W6")).toEqual({
      ok: true,
      kind: "legacy",
      branchId: "UP2W6",
      topicDeviceCode: "6CNC1",
    });
    expect(resolveTopic("mesin/telemetry", knownBranches, "UP2W6")).toEqual({
      ok: true,
      kind: "legacy",
      branchId: "UP2W6",
      topicDeviceCode: null,
    });
    expect(resolveTopic("mesin/telemetry/", knownBranches, "UP2W6")).toMatchObject({ ok: true, kind: "legacy", topicDeviceCode: null });
  });

  it("rejects branch-shaped ids that are not registered instead of dumping them into the legacy branch", () => {
    expect(resolveTopic("mesin/telemetry/UP2W7", knownBranches, "UP2W6")).toMatchObject({ ok: false, reason: "branch_unknown" });
    expect(resolveTopic("mesin/telemetry/up2w 9", knownBranches, "UP2W6")).toMatchObject({ ok: false, reason: "branch_unknown" });
  });

  it("rejects foreign topics and legacy messages when the legacy branch does not exist", () => {
    expect(resolveTopic("other/topic/UP2W1", knownBranches, "UP2W6")).toMatchObject({ ok: false, reason: "topic_invalid" });
    expect(resolveTopic("mesin/telemetry/6CNC1", new Set(["UP2W1"]), "UP2W6")).toMatchObject({ ok: false, reason: "branch_unknown" });
  });
});

describe("normalizeBranchId / normalizeDeviceCode", () => {
  it("trims, uppercases and validates", () => {
    expect(normalizeBranchId(" up2w6 ")).toBe("UP2W6");
    expect(normalizeBranchId("UP2W 4")).toBe("UP2W4");
    expect(normalizeBranchId("x")).toBeNull();
    expect(normalizeDeviceCode(" mesin-002 ")).toBe("MESIN-002");
    expect(normalizeDeviceCode(12)).toBe("12");
    expect(normalizeDeviceCode("bad code")).toBeNull();
    expect(normalizeDeviceCode("")).toBeNull();
  });
});

describe("toNumber", () => {
  it("accepts numbers and numeric strings, including comma decimals", () => {
    expect(toNumber(25.4)).toBe(25.4);
    expect(toNumber("25.4")).toBe(25.4);
    expect(toNumber("25,4")).toBe(25.4);
    expect(toNumber("n/a")).toBeNull();
    expect(toNumber(Number.NaN)).toBeNull();
    expect(toNumber(null)).toBeNull();
  });
});

describe("normalizeIp", () => {
  it("keeps valid addresses only", () => {
    expect(normalizeIp("192.168.1.10")).toBe("192.168.1.10");
    expect(normalizeIp("999.1.1.1")).toBeNull();
    expect(normalizeIp("fe80::1")).toBe("fe80::1");
    expect(normalizeIp("not-an-ip")).toBeNull();
  });
});

describe("sanitizeTimestamp", () => {
  it("accepts unix seconds, milliseconds and ISO strings", () => {
    const warnings: string[] = [];
    expect(sanitizeTimestamp(1788998400, now, warnings).toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(sanitizeTimestamp(1788998400000, now, warnings).toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(sanitizeTimestamp("2026-09-10T00:00:00Z", now, warnings).toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(warnings).toEqual([]);
  });

  it("interprets naive date strings in the configured timezone (Asia/Jakarta)", () => {
    expect(sanitizeTimestamp("2026-09-10 07:00:00", now, []).toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });

  it("falls back to the server clock for missing, unparseable, ancient or future values", () => {
    const warnings: string[] = [];
    expect(sanitizeTimestamp(undefined, now, warnings)).toBe(now);
    expect(sanitizeTimestamp("garbage", now, warnings)).toBe(now);
    expect(sanitizeTimestamp(0, now, warnings)).toBe(now);
    expect(sanitizeTimestamp(now.getTime() + 60 * 60 * 1000, now, warnings)).toBe(now);
    expect(warnings).toHaveLength(3);
  });
});

describe("deriveStatus", () => {
  it("is off when reported off, otherwise compares current against the threshold", () => {
    expect(deriveStatus(true, 100, 1)).toBe("off");
    expect(deriveStatus(false, 25.4, 22)).toBe("on_duty");
    expect(deriveStatus(false, 10, 22)).toBe("idle");
    expect(deriveStatus(false, null, 22)).toBe("idle");
    expect(deriveStatus(false, null, null)).toBe("on_duty");
  });
});

describe("normalizeTelemetry", () => {
  it("normalizes the documented payload", () => {
    const result = normalize("mesin/telemetry/up2w1", payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      branchId: "UP2W1",
      code: "6CNC1",
      topicKind: "branch",
      timestamp: now,
      reportedStatus: "on",
      isReportedOff: false,
      threshold: 22,
      arus: 25.4,
      voltase: 220.1,
      suhu: 38.2,
      kelembapan: 70.5,
      location: "Ruang CNC",
      ipAddress: null,
      firmwareVersion: "1.0",
      warnings: [],
    });
  });

  it("accepts the legacy topic layout and keeps the payload device id", () => {
    const result = normalize("mesin/telemetry/6CNC1", payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ branchId: "UP2W6", code: "6CNC1", topicKind: "legacy" });

    const bare = normalize("mesin/telemetry", payload);
    expect(bare.ok && bare.value.branchId).toBe("UP2W6");
  });

  it("falls back to the device id from a legacy topic when the payload has none", () => {
    const result = normalize("mesin/telemetry/mesin-002", { data: { arus: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.code).toBe("MESIN-002");
    expect(normalize("mesin/telemetry", { data: {} })).toMatchObject({ ok: false, reason: "device_id_invalid" });
  });

  it("rejects unusable messages with a reason", () => {
    expect(normalize("other/root", payload)).toMatchObject({ ok: false, reason: "topic_invalid" });
    expect(normalize("mesin/telemetry/UP2W1", "text")).toMatchObject({ ok: false, reason: "payload_invalid" });
    expect(normalize("mesin/telemetry/UP2W1", { data: {} })).toMatchObject({ ok: false, reason: "device_id_invalid" });
    expect(normalize("mesin/telemetry/UP2W1", { device_id: "X" })).toMatchObject({ ok: false, reason: "data_missing" });
  });

  it("nulls implausible or non-numeric readings and records a warning for each", () => {
    const result = normalize("mesin/telemetry/UP2W2", {
      device_id: "m1",
      data: { arus: "abc", suhu: 900, kelembapan: "55,5", status_mesin: "OFF" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.arus).toBeNull();
    expect(result.value.suhu).toBeNull();
    expect(result.value.kelembapan).toBe(55.5);
    expect(result.value.isReportedOff).toBe(true);
    expect(result.value.reportedStatus).toBe("off");
    expect(result.value.warnings).toHaveLength(2);
  });

  it("collapses whitespace in location and caps text length", () => {
    const result = normalize("mesin/telemetry/UP2W2", {
      device_id: "m1",
      location: "  Ruang   CNC \n",
      version: "x".repeat(50),
      data: {},
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.location).toBe("Ruang CNC");
    expect(result.value.firmwareVersion).toHaveLength(20);
  });
});
