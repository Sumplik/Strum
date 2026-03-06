import type { Device } from "@/types/device";

export function isOn(status?: string | null) {
  return status === "idle" || status === "on_duty";
}

export function countByStatus(devices: Device[]) {
  let onDuty = 0;
  let idle = 0;
  let off = 0;

  for (const d of devices) {
    const s = (d.status ?? "off").toString();
    if (s === "on_duty") onDuty++;
    else if (s === "idle") idle++;
    else off++;
  }

  return { onDuty, idle, off, on: onDuty + idle, total: devices.length };
}