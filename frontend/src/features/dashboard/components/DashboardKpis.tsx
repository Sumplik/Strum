import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { KpiCard, KpiPill } from "@/features/dashboard/components/KpiCards";

const DISCONNECT_TIMEOUT_MS = 6 * 60 * 1000;

function getLastSeen(device: any) {
  return (
    device.lastSeen ??
    device.last_seen ??
    device.lastUpdate ??
    device.updated_at ??
    null
  );
}

function isDeviceOnline(lastSeen: any) {
  if (!lastSeen) return false;

  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return false;

  return Date.now() - ts <= DISCONNECT_TIMEOUT_MS;
}

export function DashboardKpis() {
  const q = useDevices();

  if (q.isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
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

  const devices = q.data.data;

  const onlineDevices = devices.filter((d: any) =>
    isDeviceOnline(getLastSeen(d))
  );

  const total = devices.length;
  const online = onlineDevices.length;
  const disconnect = total - online;

  const idle = onlineDevices.filter((d: any) => d.status === "idle").length;
  const onDuty = onlineDevices.filter((d: any) => d.status === "on_duty").length;
  const off = onlineDevices.filter((d: any) => d.status === "off").length;

  const onFrame = idle + onDuty;

  const onDutyPct = onFrame > 0 ? Math.round((onDuty / onFrame) * 1000) / 10 : 0;
  const idlePct = onFrame > 0 ? Math.round((idle / onFrame) * 1000) / 10 : 0;
  const offPct = total > 0 ? Math.round((off / total) * 1000) / 10 : 0;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Koneksi"
        value={online}
        accent="default"
        hint={<KpiPill dot="amber" label="Disconnect" value={disconnect} />}
      />

      <KpiCard
        title="Total Mesin"
        value={total}
        hint={<KpiPill dot="blue" label="ON Frame" value={onFrame} tone="primary" />}
      />

      <KpiCard
        title="Idle"
        value={idle}
        accent="onframe"
        hint={<KpiPill dot="blue" label="Porsi Idle" value={`${idlePct}%`} tone="primary" />}
      />

      <KpiCard
        title="On Duty"
        value={onDuty}
        accent="onduty"
        hint={<KpiPill dot="green" label="Porsi ON Duty" value={`${onDutyPct}%`} tone="primary" />}
      />

      <KpiCard
        title="OFF"
        value={off}
        accent="off"
        hint={<KpiPill dot="red" label="Persen OFF" value={`${offPct}%`} />}
      />
    </div>
  );
}