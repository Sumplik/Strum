import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DeviceScope } from "@/app/useBranch";
import { queryErrorMessage } from "@/lib/query";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { KpiCard, KpiPill } from "@/features/dashboard/components/KpiCards";
import { calculateDeviceStats } from "@/features/dashboard/utils/deviceStatus";

const GRID = "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5";

// Ringkasan status mesin untuk cakupan halaman yang sedang dibuka (lihat AppShell).
export function DashboardKpis({ scope }: { scope: DeviceScope }) {
  const q = useDevices(scope);

  if (q.isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] sm:h-[110px] rounded-2xl" />
        ))}
      </div>
    );
  }

  const errorMessage = queryErrorMessage(q, "KPI gagal dimuat");
  if (errorMessage || !q.data?.success) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        <AlertDescription>{errorMessage ?? "KPI gagal dimuat"}. Cek backend / CORS.</AlertDescription>
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
