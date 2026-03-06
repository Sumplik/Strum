import { Badge } from "@/components/ui/badge";
import type { DeviceStatus } from "@/types/device";

export function StatusBadge({ status }: { status?: DeviceStatus | null }) {
  const s = (status ?? "off").toString();

  if (s === "on_duty") return <Badge className="rounded-xl bg-amber-500 text-white">On Duty</Badge>;
  if (s === "idle") return <Badge className="rounded-xl bg-green-600 text-white">Idle</Badge>;
  return <Badge variant="destructive" className="rounded-xl">OFF</Badge>;
}