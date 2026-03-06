import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { Skeleton } from "@/components/ui/skeleton";

interface MachineStats {
  onDuty: number;
  idle: number;
  off: number;
  onFrame: number;
  total: number;
  onDutyPct: number;
  offPct: number;
}

function calculateStats(devices: { status?: string | null }[]): MachineStats {
  const onDuty = devices.filter((d) => d.status === "on_duty").length;
  const idle = devices.filter((d) => d.status === "idle").length;
  const off = devices.filter((d) => d.status === "off").length;
  const onFrame = idle + onDuty;
  const total = devices.length;
  const onDutyPct = onFrame > 0 ? Math.round((onDuty / onFrame) * 1000) / 10 : 0;
  const offPct = total > 0 ? Math.round((off / total) * 1000) / 10 : 0;
  return { onDuty, idle, off, onFrame, total, onDutyPct, offPct };
}

interface StatCardProps {
  title: string;
  value: string | number;
  color?: "default" | "blue" | "orange" | "red";
}

function StatCard({ title, value, color = "default" }: StatCardProps) {
  const colorClasses = {
    default: "",
    blue: "border-l-blue-500",
    orange: "border-l-orange-500",
    red: "border-l-red-500",
  };

  const textColorClasses = {
    default: "",
    blue: "text-blue-600",
    orange: "text-orange-600",
    red: "text-red-600",
  };

  return (
    <Card className={`border-l-4 ${colorClasses[color]}`}>
      <CardContent className="p-3">
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
        <div className={`mt-0.5 text-xl font-bold ${textColorClasses[color]}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function MachineStatsCards() {
  const q = useDevices();

  if (q.isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!q.data || q.data.success === false) {
    return null;
  }

  const stats = calculateStats(q.data.data);

  return (
    <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9">
      <StatCard title="Total Mesin" value={stats.total} color="default" />
      <StatCard title="ON Frame" value={stats.onFrame} color="blue" />
      <StatCard title="ON (Idle + On Duty)" value={stats.onFrame} color="blue" />
      <StatCard title="Idle" value={stats.idle} color="blue" />
      <StatCard title="On Duty" value={stats.onDuty} color="orange" />
      <StatCard title="On Duty (detail ON)" value={stats.onDuty} color="orange" />
      <StatCard title="Porsi ON Duty" value={`${stats.onDutyPct}%`} color="orange" />
      <StatCard title="OFF (independent)" value={stats.off} color="red" />
      <StatCard title="Persen OFF" value={`${stats.offPct}%`} color="red" />
    </div>
  );
}

