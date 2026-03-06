import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { useDevices } from "@/features/dashboard/hooks/useDevices";

import { MapLayout } from "@/features/dashboard/components/MapLayout";
import DeviceDetailDialog from "@/features/dashboard/components/DeviceDetailDialog";
import type { Device } from "@/types/device";

export default function OverviewPage() {
  const devicesQ = useDevices();

  const [filter, setFilter] = React.useState<"all" | "on" | "idle" | "on_duty" | "off">("all");
  const [selected, setSelected] = React.useState<Device | null>(null);
  const [open, setOpen] = React.useState(false);

  const devices = devicesQ.data && devicesQ.data.success ? devicesQ.data.data : [];

  React.useEffect(() => {
    if (devicesQ.isError) {
      toast.error("Gagal ambil data dari backend. Cek server & CORS.");
    }
  }, [devicesQ.isError]);

  if (devicesQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[560px] rounded-2xl" />
      </div>
    );
  }

  if (!devicesQ.data || devicesQ.data.success === false) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        Gagal mengambil data dari server. Pastikan backend running di port yang benar dan CORS aktif.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <MapLayout
        devices={devices}
        filter={filter}
        onFilterChange={setFilter}
        onSelect={(d) => {
          setSelected(d);
          setOpen(true);
        }}
      />

      <DeviceDetailDialog open={open} onOpenChange={setOpen} device={selected} />
    </div>
  );
}

