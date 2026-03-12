import { Badge } from "@/components/ui/badge";
import type { DeviceStatus } from "@/types/device";

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
