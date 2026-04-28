import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DISCONNECT_TIMEOUT_MS = 6 * 60 * 1000;

interface DeviceLike {
  status?: string | null;
  lastSeen?: string | Date | null;
  last_seen?: string | Date | null;
  updated_at?: string | Date | null;
  lastUpdate?: string | Date | null;
}

interface MachineStats {
  total: number;
  onDuty: number;
  idle: number;
  off: number;
  onFrame: number;
  online: number;
  disconnect: number;
  onDutyPct: number;
  idlePct: number;
  offPct: number;
}

function getLastSeen(device: DeviceLike): string | Date | null {
  return (
    device.lastSeen ??
    device.last_seen ??
    device.lastUpdate ??
    device.updated_at ??
    null
  );
}

function isDeviceOnline(lastSeen?: string | Date | null): boolean {
  if (!lastSeen) return false;

  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return false;

  return Date.now() - ts <= DISCONNECT_TIMEOUT_MS;
}

function calculateStats(devices: DeviceLike[]): MachineStats {
  const onlineDevices = devices.filter((d) =>
    isDeviceOnline(getLastSeen(d))
  );

  const disconnect = devices.length - onlineDevices.length;

  const onDuty = onlineDevices.filter((d) => d.status === "on_duty").length;
  const idle = onlineDevices.filter((d) => d.status === "idle").length;
  const off = onlineDevices.filter((d) => d.status === "off").length;

  const onFrame = idle + onDuty;
  const total = devices.length;
  const online = onlineDevices.length;

  const onDutyPct = onFrame > 0 ? Math.round((onDuty / onFrame) * 1000) / 10 : 0;
  const idlePct = onFrame > 0 ? Math.round((idle / onFrame) * 1000) / 10 : 0;
  const offPct = total > 0 ? Math.round((off / total) * 1000) / 10 : 0;

  return {
    total,
    onDuty,
    idle,
    off,
    onFrame,
    online,
    disconnect,
    onDutyPct,
    idlePct,
    offPct,
  };
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitleLabel: string;
  subtitleValue: string | number;
  color?: "slate" | "blue" | "green" | "red" | "yellow";
}

function SummaryCard({
  title,
  value,
  subtitleLabel,
  subtitleValue,
  color = "slate",
}: SummaryCardProps) {
  const styles = {
    slate: {
      card: "border-slate-700/80",
      top: "bg-slate-400",
      dot: "bg-slate-400",
    },
    blue: {
      card: "border-blue-500/60",
      top: "bg-blue-500",
      dot: "bg-blue-500",
    },
    green: {
      card: "border-emerald-500/60",
      top: "bg-emerald-500",
      dot: "bg-emerald-500",
    },
    red: {
      card: "border-rose-500/60",
      top: "bg-rose-500",
      dot: "bg-rose-500",
    },
    yellow: {
      card: "border-amber-500/60",
      top: "bg-amber-400",
      dot: "bg-amber-400",
    },
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-[#0f1724] text-white shadow-sm",
        styles[color].card
      )}
    >
      <div className={cn("absolute left-5 top-0 h-1 w-12 rounded-b-full", styles[color].top)} />
      <CardContent className="p-6">
        <div className="text-sm text-slate-300">{title}</div>
        <div className="mt-4 text-5xl font-bold tracking-tight">{value}</div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-200">
          <span className={cn("h-2.5 w-2.5 rounded-full", styles[color].dot)} />
          <span>{subtitleLabel}:</span>
          <span className="font-semibold">{subtitleValue}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MachineStatsCards() {
  const q = useDevices();

  if (q.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!q.data || q.data.success === false) {
    return null;
  }

  const stats = calculateStats(q.data.data);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        title="Koneksi"
        value={stats.online}
        subtitleLabel="Disconnect"
        subtitleValue={stats.disconnect}
        color="yellow"
      />

      <SummaryCard
        title="Total Mesin"
        value={stats.total}
        subtitleLabel="ON Frame"
        subtitleValue={stats.onFrame}
        color="slate"
      />

      <SummaryCard
        title="Idle"
        value={stats.idle}
        subtitleLabel="Porsi Idle"
        subtitleValue={`${stats.idlePct}%`}
        color="blue"
      />

      <SummaryCard
        title="On Duty"
        value={stats.onDuty}
        subtitleLabel="Porsi ON Duty"
        subtitleValue={`${stats.onDutyPct}%`}
        color="green"
      />

      <SummaryCard
        title="OFF"
        value={stats.off}
        subtitleLabel="Persen OFF"
        subtitleValue={`${stats.offPct}%`}
        color="red"
      />
    </div>
  );
}