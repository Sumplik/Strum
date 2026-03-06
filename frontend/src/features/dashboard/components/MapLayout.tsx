import * as React from "react";
import type { Device, DeviceStatus } from "@/types/device";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapLayoutProps {
  devices: Device[];
  filter: "all" | "on" | "idle" | "on_duty" | "off";
  onFilterChange: (filter: "all" | "on" | "idle" | "on_duty" | "off") => void;
  onSelect: (device: Device) => void;
}

// List workshop yang tersedia
const WORKSHOPS = ["W1", "W2", "W3", "W4", "W5", "G1"];

// Helper function untuk mendapatkan location dari device
function getDeviceLocation(device: Device): string | null {
  // Prioritas: field location langsung, kalau tidak ada ambil dari rawData
  return device.location ?? device.rawData?.location ?? null;
}

// Helper function untuk mendapatkan warna status
function getStatusColor(status: DeviceStatus | null | undefined): string {
  switch (status) {
    case "on_duty":
      return "bg-amber-500";
    case "idle":
      return "bg-green-600";
    case "off":
    default:
      return "bg-red-500";
  }
}

export function MapLayout({ devices, filter, onFilterChange, onSelect }: MapLayoutProps): React.ReactElement {
  // Toggle filter options
  const toggleFilters: Array<{ value: "all" | "on" | "idle" | "on_duty" | "off"; label: string }> = [
    { value: "all", label: "Semua" },
    { value: "on", label: "ON" },
    { value: "idle", label: "Idle" },
    { value: "on_duty", label: "On Duty" },
    { value: "off", label: "OFF" },
  ];

  const filteredDevices = React.useMemo(() => {
    if (filter === "all") return devices;
    if (filter === "on") return devices.filter((d) => d.status === "idle" || d.status === "on_duty");
    return devices.filter((d) => d.status === filter);
  }, [devices, filter]);

  // Group devices by workshop location
  const devicesByWorkshop = React.useMemo(() => {
    const grouped: Record<string, Device[]> = {};
    WORKSHOPS.forEach((ws) => {
      grouped[ws] = filteredDevices.filter((d) => getDeviceLocation(d) === ws);
    });
    return grouped;
  }, [filteredDevices]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Title */}
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle className="text-lg">Peta Lokasi Mesin</CardTitle>
          </div>

          {/* Filter & Legend - Top Right */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Toggle Buttons */}
            <div className="flex flex-wrap gap-1">
              {toggleFilters.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFilterChange(f.value)}
                  className={cn("rounded-lg h-7 text-xs px-2", filter === f.value && "ring-2 ring-offset-1")}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <span>On Duty</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-green-600"></span>
                <span>Idle</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                <span>OFF</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Workshop Grid - 6 Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {WORKSHOPS.map((workshop) => {
            const workshopDevices = devicesByWorkshop[workshop] || [];
            const hasDevices = workshopDevices.length > 0;
            
            return (
              <div
                key={workshop}
                className={cn(
                  "rounded-xl border bg-card p-3 transition-colors",
                  !hasDevices && "opacity-60"
                )}
              >
                {/* Workshop Header - Tanpa Status */}
                <div className="mb-3 border-b pb-2">
                  <span className="font-bold text-lg">{workshop}</span>
                </div>

                {/* Machine Cards inside Workshop */}
                <div className="space-y-2">
                  {hasDevices ? (
                    workshopDevices.map((device) => (
                      <div
                        key={device.id}
                        className="cursor-pointer rounded-lg border bg-background p-2 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                        onClick={() => onSelect(device)}
                      >
                        <div className="flex items-center gap-2">
                          {/* Status Dot */}
                          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getStatusColor(device.status))}></span>
                          {/* Machine ID */}
                          <span className="font-semibold text-sm truncate">{device.id}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Tidak ada mesin
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
