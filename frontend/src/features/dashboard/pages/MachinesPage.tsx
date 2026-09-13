import { useMemo, useState } from "react";
import { useBranch } from "@/app/useBranch";
import { queryErrorMessage } from "@/lib/query";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceTable } from "@/features/dashboard/components/DeviceTable";
import DeviceDetailDialog from "@/features/dashboard/components/DeviceDetailDialog";
import type { Device, DeviceStatus } from "@/types/device";
import { Search, X } from "lucide-react";

type StatusFilter = "all" | DeviceStatus;

const EMPTY: Device[] = [];

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "on_duty", label: "On Duty" },
  { value: "idle", label: "Idle" },
  { value: "off", label: "OFF" },
];

function matchesSearch(device: Device, term: string): boolean {
  if (!term) return true;
  return [device.code, device.branchId, device.ipAddress ?? "", device.location ?? ""].some((field) =>
    field.toLowerCase().includes(term),
  );
}

// Daftar mesin untuk cakupan yang dipilih di topbar (satu cabang atau semua cabang).
export default function MachinesPage() {
  const { scope, branchLabel } = useBranch();
  const devicesQuery = useDevices(scope);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const devices = devicesQuery.data?.success ? devicesQuery.data.data : EMPTY;

  const statusCounts = useMemo(
    () => ({
      all: devices.length,
      on_duty: devices.filter((d) => d.status === "on_duty").length,
      idle: devices.filter((d) => d.status === "idle").length,
      off: devices.filter((d) => d.status === "off").length,
    }),
    [devices],
  );

  const displayedDevices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return devices.filter((d) => (statusFilter === "all" || d.status === statusFilter) && matchesSearch(d, term));
  }, [devices, search, statusFilter]);

  if (devicesQuery.isLoading) {
    return <Skeleton className="h-screen rounded-xl" />;
  }

  const errorMessage = queryErrorMessage(devicesQuery, "Gagal load data mesin");
  if (errorMessage || !devicesQuery.data?.success) {
    return (
      <Alert variant="destructive" className="rounded-xl">
        <AlertDescription>{errorMessage ?? "Gagal load data mesin"}. Pastikan backend aktif.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Daftar Mesin</h1>
              <p className="text-muted-foreground">
                {devices.length} mesin terpasang · {branchLabel(scope)} ({displayedDevices.length} ditampilkan)
              </p>
            </div>
            <div className="flex -space-x-px">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "secondary"}
                  size="sm"
                  className="px-3 py-1 rounded-l-none first:rounded-l-xl whitespace-nowrap text-xs font-medium h-auto"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label} ({statusCounts[filter.value]})
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, cabang, IP, atau lokasi..."
              className="pl-10 pr-10"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-10 w-10 p-0"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DeviceTable
        devices={displayedDevices}
        onSelect={(d) => {
          setSelectedDevice(d);
          setDialogOpen(true);
        }}
      />

      <DeviceDetailDialog open={dialogOpen} onOpenChange={setDialogOpen} device={selectedDevice} />
    </div>
  );
}
