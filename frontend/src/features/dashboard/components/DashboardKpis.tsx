import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { KpiCard, KpiPill } from "@/features/dashboard/components/KpiCards";
import { calculateDeviceStats } from "@/features/dashboard/utils/deviceStatus";

const GRID = "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5";

export function DashboardKpis() {
  const q = useDevices();

  if (q.isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] sm:h-[110px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!q.data || q.data.success === false) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        KPI gagal dimuat. Cek backend / CORS.
      </Alert>
    );
  }

  const stats = calculateDeviceStats(q.data.data);

  return (
    <div className={GRID}>
      <KpiCard
        title="Koneksi"
        value={stats.online}
        accent="default"
        hint={<KpiPill dot="amber" label="Disconnect" value={stats.disconnect} />}
      />
      <KpiCard
        title="Total Mesin"
        value={stats.total}
        hint={<KpiPill dot="blue" label="ON Frame" value={stats.onFrame} tone="primary" />}
      />
      <KpiCard
        title="Idle"
        value={stats.idle}
        accent="onframe"
        hint={<KpiPill dot="blue" label="Porsi Idle" value={`${stats.idlePct}%`} tone="primary" />}
      />
      <KpiCard
        title="On Duty"
        value={stats.onDuty}
        accent="onduty"
        hint={<KpiPill dot="green" label="Porsi ON Duty" value={`${stats.onDutyPct}%`} tone="primary" />}
      />
      <KpiCard
        title="OFF"
        value={stats.off}
        accent="off"
        hint={<KpiPill dot="red" label="Persen OFF" value={`${stats.offPct}%`} />}
      />
    </div>
  );
}
