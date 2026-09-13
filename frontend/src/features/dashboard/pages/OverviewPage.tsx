import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { useBranch } from "@/app/useBranch";
import { queryErrorMessage } from "@/lib/query";
import { useDevices } from "@/features/dashboard/hooks/useDevices";

import { MapLayout, type MapFilter } from "@/features/dashboard/components/MapLayout";
import DeviceDetailDialog from "@/features/dashboard/components/DeviceDetailDialog";
import type { Device } from "@/types/device";

export default function OverviewPage() {
  const { branchId } = useBranch();
  const devicesQ = useDevices(branchId);

  const [filter, setFilter] = React.useState<MapFilter>("all");
  const [selected, setSelected] = React.useState<Device | null>(null);
  const [open, setOpen] = React.useState(false);

  if (devicesQ.isLoading) {
    return (
      <div className="space-y-4 px-2 sm:px-4">
        <Skeleton className="h-[60vh] sm:h-[70vh] rounded-2xl" />
      </div>
    );
  }

  const errorMessage = queryErrorMessage(devicesQ, "Gagal mengambil data dari server");
  if (errorMessage || !devicesQ.data?.success) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        <AlertDescription>
          {errorMessage ?? "Gagal mengambil data dari server"}. Pastikan backend running di port yang benar dan CORS aktif.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <MapLayout
        branchId={branchId}
        devices={devicesQ.data.data}
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
