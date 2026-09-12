import { config } from "../config";
import { fromWallClock } from "../lib/time";

export type MachineStatus = "off" | "idle" | "on_duty";

export type TopicKind = "branch" | "legacy";

export interface Telemetry {
  branchId: string;
  code: string;
  topicKind: TopicKind;
  timestamp: Date;
  reportedStatus: string | null;
  isReportedOff: boolean;
  threshold: number | null;
  arus: number | null;
  voltase: number | null;
  suhu: number | null;
  kelembapan: number | null;
  location: string | null;
  ipAddress: string | null;
  firmwareVersion: string | null;
  warnings: string[];
}

export type RejectReason =
  | "topic_invalid"
  | "branch_unknown"
  | "payload_invalid"
  | "device_id_invalid"
  | "data_missing";

export type NormalizeResult =
  | { ok: true; value: Telemetry }
  | { ok: false; reason: RejectReason; message: string };

export interface NormalizeOptions {
  now?: Date;
  knownBranches: ReadonlySet<string>;
  legacyBranchId?: string;
  topicRoot?: string;
}

export const BRANCH_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,19}$/;
export const DEVICE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,49}$/;
// Ids shaped like the standard branch naming (UP2W1, UP3W12, ...) are never mistaken for machine ids.
const BRANCH_LIKE_PATTERN = /^UP\d+W\d+$/;

const OFF_WORDS = new Set(["off", "0", "false", "mati", "no"]);
const MAX_UNIX_SECONDS = 9_999_999_999;
const EARLIEST_ACCEPTED = Date.UTC(2020, 0, 1);
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

const RANGES: Record<"arus" | "voltase" | "suhu" | "kelembapan" | "threshold", [number, number]> = {
  arus: [0, 10_000],
  voltase: [0, 10_000],
  suhu: [-100, 500],
  kelembapan: [0, 100],
  threshold: [0, 10_000],
};

// "up2w 1" → "UP2W1": whitespace anywhere inside the id is dropped.
export function normalizeBranchId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.replace(/\s+/g, "").toUpperCase();
  return BRANCH_ID_PATTERN.test(id) ? id : null;
}

export function normalizeDeviceCode(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const code = String(value).trim().toUpperCase();
  return DEVICE_CODE_PATTERN.test(code) ? code : null;
}

export type TopicResolution =
  | { ok: true; kind: "branch"; branchId: string }
  | { ok: true; kind: "legacy"; branchId: string; topicDeviceCode: string | null }
  | { ok: false; reason: "topic_invalid" | "branch_unknown"; message: string };

// <root>/<branchId>[/...] for new devices; <root> or <root>/<deviceId> for devices that predate branches.
export function resolveTopic(
  topic: string,
  knownBranches: ReadonlySet<string>,
  legacyBranchId = config.mqtt.legacyBranchId,
  root = config.mqtt.topicRoot,
): TopicResolution {
  const trimmed = topic.trim();
  if (trimmed !== root && !trimmed.startsWith(`${root}/`)) {
    return { ok: false, reason: "topic_invalid", message: `topic tidak dikenali: ${topic}` };
  }

  const first = trimmed === root ? "" : trimmed.slice(root.length + 1).split("/")[0].trim();
  const asBranch = normalizeBranchId(first);

  if (asBranch && knownBranches.has(asBranch)) {
    return { ok: true, kind: "branch", branchId: asBranch };
  }
  if (asBranch && BRANCH_LIKE_PATTERN.test(asBranch)) {
    return { ok: false, reason: "branch_unknown", message: `cabang ${asBranch} tidak terdaftar (topic ${topic})` };
  }
  if (!knownBranches.has(legacyBranchId)) {
    return {
      ok: false,
      reason: "branch_unknown",
      message: `cabang legacy ${legacyBranchId} belum terdaftar, pesan dari topic lama ${topic} tidak bisa disimpan`,
    };
  }
  return { ok: true, kind: "legacy", branchId: legacyBranchId, topicDeviceCode: first ? normalizeDeviceCode(first) : null };
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let text = value.trim();
  if (!text) return null;
  if (text.includes(",") && !text.includes(".")) text = text.replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMeasurement(
  field: keyof typeof RANGES,
  value: unknown,
  warnings: string[],
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = toNumber(value);
  if (parsed === null) {
    warnings.push(`${field}: bukan angka (${JSON.stringify(value)})`);
    return null;
  }
  const [min, max] = RANGES[field];
  if (parsed < min || parsed > max) {
    warnings.push(`${field}: di luar rentang wajar (${parsed})`);
    return null;
  }
  return parsed;
}

function toText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6 = /^[0-9a-f:]{2,39}$/i;

export function normalizeIp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ip = value.trim();
  const v4 = IPV4.exec(ip);
  if (v4) return v4.slice(1).every((octet) => Number(octet) <= 255) ? ip : null;
  return IPV6.test(ip) && ip.includes(":") ? ip.toLowerCase() : null;
}

const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

function parseRawTimestamp(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > MAX_UNIX_SECONDS ? value : value * 1000);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  const naive = NAIVE_DATETIME.exec(text);
  if (naive) {
    return fromWallClock({
      year: Number(naive[1]),
      month: Number(naive[2]),
      day: Number(naive[3]),
      hour: Number(naive[4]),
      minute: Number(naive[5]),
      second: Number(naive[6] ?? 0),
    });
  }
  if (/^\d+$/.test(text)) return parseRawTimestamp(Number(text));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Device clocks are unreliable: unparseable, pre-2020 or clearly-future values fall back to the server clock.
export function sanitizeTimestamp(value: unknown, now: Date, warnings: string[]): Date {
  if (value === undefined || value === null || value === "") return now;
  const parsed = parseRawTimestamp(value);
  if (!parsed) {
    warnings.push(`timestamp: tidak valid (${JSON.stringify(value)})`);
    return now;
  }
  if (parsed.getTime() < EARLIEST_ACCEPTED) {
    warnings.push(`timestamp: terlalu lama (${parsed.toISOString()}), pakai waktu server`);
    return now;
  }
  if (parsed.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    warnings.push(`timestamp: di masa depan (${parsed.toISOString()}), pakai waktu server`);
    return now;
  }
  return parsed;
}

export function normalizeReportedStatus(value: unknown): { text: string | null; isOff: boolean } {
  if (value === undefined || value === null) return { text: null, isOff: false };
  if (typeof value === "boolean") return { text: value ? "on" : "off", isOff: !value };
  const text = String(value).trim().toLowerCase().slice(0, 20);
  if (!text) return { text: null, isOff: false };
  return { text, isOff: OFF_WORDS.has(text) };
}

export function deriveStatus(isReportedOff: boolean, arus: number | null, threshold: number | null): MachineStatus {
  if (isReportedOff) return "off";
  return (arus ?? 0) >= (threshold ?? 0) ? "on_duty" : "idle";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeTelemetry(topic: string, payload: unknown, options: NormalizeOptions): NormalizeResult {
  const now = options.now ?? new Date();
  const resolved = resolveTopic(topic, options.knownBranches, options.legacyBranchId, options.topicRoot);
  if (!resolved.ok) return resolved;

  if (!isRecord(payload)) {
    return { ok: false, reason: "payload_invalid", message: "payload bukan objek JSON" };
  }

  const topicDeviceCode = resolved.kind === "legacy" ? resolved.topicDeviceCode : null;
  const code = normalizeDeviceCode(payload.device_id) ?? topicDeviceCode;
  if (!code) {
    return { ok: false, reason: "device_id_invalid", message: `device_id tidak valid: ${JSON.stringify(payload.device_id)} (topic ${topic})` };
  }
  if (!isRecord(payload.data)) {
    return { ok: false, reason: "data_missing", message: `data tidak ada untuk ${code}` };
  }

  const warnings: string[] = [];
  const connection = isRecord(payload.connection) ? payload.connection : {};
  const reported = normalizeReportedStatus(payload.data.status_mesin);

  return {
    ok: true,
    value: {
      branchId: resolved.branchId,
      code,
      topicKind: resolved.kind,
      timestamp: sanitizeTimestamp(connection.ts, now, warnings),
      reportedStatus: reported.text,
      isReportedOff: reported.isOff,
      threshold: toMeasurement("threshold", payload.threshold, warnings),
      arus: toMeasurement("arus", payload.data.arus, warnings),
      voltase: toMeasurement("voltase", payload.data.voltase, warnings),
      suhu: toMeasurement("suhu", payload.data.suhu, warnings),
      kelembapan: toMeasurement("kelembapan", payload.data.kelembapan, warnings),
      location: toText(payload.location, 100),
      ipAddress: normalizeIp(connection.ipaddress),
      firmwareVersion: toText(payload.version, 20),
      warnings,
    },
  };
}
