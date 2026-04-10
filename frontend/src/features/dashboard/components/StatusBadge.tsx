import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { TriangleAlert } from "lucide-react";
import type { DeviceStatus } from "@/types/device";
import type { Device } from "@/types/device";

export function StatusBadge({ status }: { status?: DeviceStatus | null }) {
  const s = (status ?? "off").toString();
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Status colors based on requirements:
  // Idle: Blue (biru)
  // On Duty: Green (hijau)
  // OFF: Red (merah)
  if (s === "on_duty") return <Badge className={isDark ? "rounded-xl bg-green-500/90 text-white font-semibold" : "rounded-xl bg-green-500 text-white font-semibold"}>On Duty</Badge>;
  if (s === "idle") return <Badge className={isDark ? "rounded-xl bg-blue-500/90 text-white font-semibold" : "rounded-xl bg-blue-500 text-white font-semibold"}>Idle</Badge>;
  return <Badge className={isDark ? "rounded-xl bg-red-500/90 text-white font-semibold" : "rounded-xl bg-red-500 text-white font-semibold"}>OFF</Badge>;
}

export function WarningBadge({ device }: { device: Device }) {
  const now = Date.now();
  const lastSeenTime = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
  const minutesAgo = Math.floor((now - lastSeenTime) / (1000 * 60));
  const isWarning = minutesAgo > 5;
  if (!isWarning) return null;
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={isDark ? "ml-1 rounded-xl bg-yellow-500/90 text-white font-semibold" : "ml-1 rounded-xl bg-yellow-500 text-white font-semibold"}>
            <TriangleAlert className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tidak mengirim data sejak {minutesAgo} menit lalu</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

