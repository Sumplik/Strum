import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TriangleAlert } from "lucide-react";
import type { Device } from "@/types/device";
import { fmtDateTime } from "@/lib/utils";
import { minutesSince, statusLabel, type EffectiveDeviceStatus } from "@/features/dashboard/utils/deviceStatus";

const STATUS_COLORS: Record<EffectiveDeviceStatus, string> = {
  on_duty: "bg-green-500",
  idle: "bg-blue-500",
  off: "bg-red-500",
  disconnect: "bg-slate-500",
};

export function StatusBadge({ status }: { status?: EffectiveDeviceStatus | null }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold text-white ${STATUS_COLORS[status ?? "off"]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

// Peringatan untuk mesin yang sudah tidak mengirim data (offline), dengan detail status terakhir.
export function WarningBadge({ device }: { device: Device }) {
  const minutesAgo = minutesSince(device.lastSeen);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-yellow-300 bg-yellow-400 text-white shadow-sm outline-none transition hover:bg-yellow-500"
        >
          <TriangleAlert className="h-4 w-4" />
        </button>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="center"
        className="z-50 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="space-y-1">
          <div className="font-semibold text-yellow-600 dark:text-yellow-400">
            Perangkat tidak mengirim data
          </div>
          <div>Status terakhir: {statusLabel(device.status)}</div>
          <div>Last seen: {fmtDateTime(device.lastSeen)}</div>
          <div>Terlambat: {minutesAgo === null ? "-" : `${minutesAgo} menit lalu`}</div>
          <div>Arus terakhir: {device.arus ?? "-"}</div>
          <div>Voltase terakhir: {device.voltase ?? "-"}</div>
          <div>Lokasi: {device.location ?? "-"}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
