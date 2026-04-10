import React, { useState, useMemo } from "react";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceTable } from "@/features/dashboard/components/DeviceTable";
import DeviceDetailDialog from "@/features/dashboard/components/DeviceDetailDialog";
import type { Device } from "@/types/device";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "on_duty" | "idle" | "off";

export default function MachinesPage() {
  const devicesQuery = useDevices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (devicesQuery.isLoading) {
    return <Skeleton className="h-screen rounded-xl" />;
  }

  if (!devicesQuery.data?.success) {
    return (
      <Alert className="rounded-xl">
        Gagal load data mesin. Pastikan backend aktif.
      </Alert>
    );
  }

  const devices = devicesQuery.data.data;

  const stats = useMemo(() => {
    const onDuty = devices.filter((d) => d.status === "on_duty").length;
    const idle = devices.filter((d) => d.status === "idle").length;
    const off = devices.filter((d) => d.status === "off").length;
    return { onDuty, idle, off, total: devices.length };
  }, [devices]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return devices;
    const lowerSearch = search.toLowerCase();
    return devices.filter((d) => 
      d.id.toLowerCase().includes(lowerSearch) ||
      (d.ipAddress ?? "").toLowerCase().includes(lowerSearch) ||
      (d.location ?? "").toLowerCase().includes(lowerSearch)
    );
  }, [devices, search]);

  const displayedDevices = useMemo(() => {
    if (statusFilter === "all") return searchFiltered;
    return searchFiltered.filter((d) => d.status === statusFilter);
  }, [searchFiltered, statusFilter]);

  const filters = [
    { value: "all" as StatusFilter, label: "All", count: stats.total },
    { value: "on_duty" as StatusFilter, label: "On Duty", count: stats.onDuty },
    { value: "idle" as StatusFilter, label: "Idle", count: stats.idle },
    { value: "off" as StatusFilter, label: "OFF", count: stats.off },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Daftar Mesin</h1>
              <p className="text-muted-foreground">{devices.length} mesin terdeteksi ({displayedDevices.length} ditampilkan)</p>
            </div>
            <div className="flex gap-2">
              <div className="flex -space-x-px">
                {filters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={statusFilter === filter.value ? "default" : "secondary"}
                    size="sm"
                    className="px-3 py-1 rounded-l-none first:rounded-l-xl whitespace-nowrap text-xs font-medium h-auto"
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label} ({filter.count})
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, IP, atau lokasi..."
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

      <DeviceTable devices={displayedDevices} onSelect={(d) => {
        setSelectedDevice(d);
        setDialogOpen(true);
      }} />

      <DeviceDetailDialog open={dialogOpen} onOpenChange={setDialogOpen} device={selectedDevice} />
    </div>
  );
}

