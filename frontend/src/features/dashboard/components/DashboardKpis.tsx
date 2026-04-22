import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { useStats } from "@/features/dashboard/hooks/useStats";
import { KpiCard, KpiPill } from "@/features/dashboard/components/KpiCards";

export function DashboardKpis() {
  const statsQ = useStats();

  if (statsQ.isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] sm:h-[110px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data || statsQ.data.success === false) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        KPI gagal dimuat. Cek backend / CORS.
      </Alert>
    );
  }

  const stats = statsQ.data.data;
  console.log("DASHBOARD KPI STATS:", stats);
  const on = stats.on ?? stats.idle + stats.onDuty;
  const onDutyPct =
    typeof stats.percentOnDuty === "number"
      ? stats.percentOnDuty
      : on ? Math.round((stats.onDuty / on) * 1000) / 10 : 0;

  const idlePct =
    typeof stats.percentIdle === "number"
      ? stats.percentIdle
      : on ? Math.round((stats.idle / on) * 1000) / 10 : 0;

  const offPct =
    typeof stats.percentOff === "number"
      ? stats.percentOff
      : stats.total ? Math.round((stats.off / stats.total) * 1000) / 10 : 0;
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Koneksi"
        value={stats.online ?? 0}
        accent="default"
        hint={<KpiPill dot="amber" label="Disconnect" value={stats.disconnect ?? 0} />}
      />

      <KpiCard
        title="Total Mesin"
        value={stats.total}
        hint={<KpiPill dot="blue" label="ON Frame" value={on} tone="primary" />}
      />

      <KpiCard
        title="Idle"
        value={stats.idle}
        accent="onframe"
        hint={<KpiPill dot="blue" label="Porsi Idle" value={`${idlePct}%`} tone="primary" />}
      />

      <KpiCard
        title="On Duty"
        value={stats.onDuty}
        accent="onduty"
        hint={<KpiPill dot="green" label="Porsi ON Duty" value={`${onDutyPct}%`} tone="primary" />}
      />

      <KpiCard
        title="OFF"
        value={stats.off}
        accent="off"
        hint={<KpiPill dot="red" label="Persen OFF" value={`${offPct}%`} />}
      />
    </div>
  );
}