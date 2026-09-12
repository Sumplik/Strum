import type { Device, DeviceStatus } from "@/types/device";

export const DISCONNECT_TIMEOUT_MS = 6 * 60 * 1000;

export type EffectiveDeviceStatus = DeviceStatus | "disconnect";

export const STATUS_LABELS: Record<"on_duty" | "idle" | "off" | "disconnect", string> = {
  on_duty: "On Duty",
  idle: "Idle",
  off: "OFF",
  disconnect: "Disconnect",
};

export function statusLabel(status?: EffectiveDeviceStatus | null): string {
  const key = (status ?? "off").toString();
  return key in STATUS_LABELS ? STATUS_LABELS[key as keyof typeof STATUS_LABELS] : STATUS_LABELS.off;
}

export function minutesSince(lastSeen?: string | Date | null): number | null {
  if (!lastSeen) return null;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / (1000 * 60));
}

export const DEVICE_WARNING_MINUTES = 5;

export function warningMinutes(device: Device): number | null {
  const minutes = minutesSince(device.lastSeen);
  return minutes !== null && minutes > DEVICE_WARNING_MINUTES ? minutes : null;
}

export function isDeviceWarning(device: Device): boolean {
  return warningMinutes(device) !== null;
}

export function isDeviceOnline(lastSeen?: string | Date | null): boolean {
  if (!lastSeen) return false;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= DISCONNECT_TIMEOUT_MS;
}

export function getEffectiveStatus(device: Device): EffectiveDeviceStatus {
  if (!isDeviceOnline(device.lastSeen)) return "disconnect";

  if (device.status === "on_duty" || device.status === "idle" || device.status === "off") {
    return device.status;
  }

  return "disconnect";
}

export interface DeviceStats {
  total: number;
  online: number;
  disconnect: number;
  idle: number;
  onDuty: number;
  off: number;
  onFrame: number;
  idlePct: number;
  onDutyPct: number;
  offPct: number;
}

const roundPct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

export function calculateDeviceStats(devices: Device[]): DeviceStats {
  const onlineDevices = devices.filter((d) => isDeviceOnline(d.lastSeen));

  const total = devices.length;
  const online = onlineDevices.length;
  const idle = onlineDevices.filter((d) => d.status === "idle").length;
  const onDuty = onlineDevices.filter((d) => d.status === "on_duty").length;
  const off = onlineDevices.filter((d) => d.status === "off").length;
  const onFrame = idle + onDuty;

  return {
    total,
    online,
    disconnect: total - online,
    idle,
    onDuty,
    off,
    onFrame,
    idlePct: roundPct(idle, onFrame),
    onDutyPct: roundPct(onDuty, onFrame),
    offPct: roundPct(off, total),
  };
}
