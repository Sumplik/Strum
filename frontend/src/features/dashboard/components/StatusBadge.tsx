import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { TriangleAlert } from "lucide-react";
import type { DeviceStatus, Device } from "@/types/device";
import { fmtDateTime } from "@/lib/utils";

const DEVICE_WARNING_MINUTES = 5;

type ExtendedDeviceStatus = DeviceStatus | "disconnect";

export function StatusBadge({
  status,
}: {
  status?: ExtendedDeviceStatus | null;
}) {
  const s = (status ?? "off").toString();

  const baseClass =
    "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold text-white border-0 shadow-none hover:text-white focus:text-white";

  if (s === "disconnect") {
    return <span className={`${baseClass} bg-slate-500`}>Disconnect</span>;
  }

  if (s === "on_duty") {
    return <span className={`${baseClass} bg-green-500`}>On Duty</span>;
  }

  if (s === "idle") {
    return <span className={`${baseClass} bg-blue-500`}>Idle</span>;
  }

  return <span className={`${baseClass} bg-red-500`}>OFF</span>;
}

export function isDeviceWarning(device: Device) {
  const lastSeenTime = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
  if (!lastSeenTime) return false;

  const now = Date.now();
  const minutesAgo = Math.floor((now - lastSeenTime) / (1000 * 60));

  return minutesAgo > DEVICE_WARNING_MINUTES;
}

function getStatusLabel(status?: ExtendedDeviceStatus | null) {
  const s = (status ?? "off").toString();

  if (s === "disconnect") return "Disconnect";
  if (s === "on_duty") return "On Duty";
  if (s === "idle") return "Idle";
  return "OFF";
}

export function WarningBadge({ device }: { device: Device }) {
  const lastSeenTime = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
  if (!lastSeenTime) return null;

  const now = Date.now();
  const diffMs = now - lastSeenTime;
  const minutesAgo = Math.floor(diffMs / (1000 * 60));

  if (minutesAgo <= DEVICE_WARNING_MINUTES) return null;

  return (
    <TooltipProvider>
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
            <div>Status terakhir: {getStatusLabel(device.status)}</div>
            <div>Last seen: {fmtDateTime(device.lastSeen)}</div>
            <div>Terlambat: {minutesAgo} menit lalu</div>
            <div>Arus terakhir: {device.arus ?? "-"}</div>
            <div>Voltase terakhir: {device.voltase ?? "-"}</div>
            <div>Lokasi: {device.location ?? "-"}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}