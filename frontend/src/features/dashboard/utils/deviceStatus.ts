import type { Device, DeviceStatus } from "@/types/device";

// Status mesin termasuk "disconnect" (tidak mengirim data > 6 menit); backend yang menentukan lewat
// `device.online` / `device.effectiveStatus`, frontend hanya menampilkan.
export type EffectiveDeviceStatus = DeviceStatus | "disconnect";

const STATUS_LABELS: Record<EffectiveDeviceStatus, string> = {
  on_duty: "On Duty",
  idle: "Idle",
  off: "OFF",
  disconnect: "Disconnect",
};

export function statusLabel(status?: EffectiveDeviceStatus | null): string {
  return STATUS_LABELS[status ?? "off"] ?? STATUS_LABELS.off;
}

// Menit sejak data terakhir diterima; null jika lastSeen tidak valid.
export function minutesSince(lastSeen?: string | Date | null): number | null {
  if (!lastSeen) return null;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60)));
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

// Status idle/on_duty/off hanya dihitung untuk mesin yang online; sisanya masuk "disconnect".
export function calculateDeviceStats(devices: Device[]): DeviceStats {
  const onlineDevices = devices.filter((d) => d.online);

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
