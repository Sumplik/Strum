import DenahSvg from "@/assets/images/denah.svg";
import { MAP_POSITIONS } from "../config/mapPositions";
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

// 🔧 Normalize lokasi (biar CNC kebaca)
function normalizeLocation(loc?: string | null) {
  if (!loc) return null;
  if (loc.toLowerCase().includes("cnc")) return "CNC";
  return loc;
}

// 🎨 Warna status
function getStatusColor(status: DeviceStatus | null | undefined): string {
  switch (status) {
    case "on_duty":
      return "bg-green-300 dark:bg-green-400";
    case "idle":
      return "bg-blue-300 dark:bg-blue-400";
    case "off":
    default:
      return "bg-red-300 dark:bg-red-400";
  }
}

// 📦 Offset biar device nggak numpuk
function getDotOffset(index: number) {
  const col = index % 2;
  const row = Math.floor(index / 2);

  return {
    dx: (col - 0.5) * 18, // pixel
    dy: row * 18,
  };
}

export function MapLayout({
  devices,
  filter,
  onFilterChange,
  onSelect,
}: MapLayoutProps): React.ReactElement {
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // 🎛 filter
  const toggleFilters = [
    { value: "all", label: "Semua" },
    { value: "on", label: "ON" },
    { value: "idle", label: "Idle" },
    { value: "on_duty", label: "On Duty" },
    { value: "off", label: "OFF" },
  ] as const;

  const filteredDevices = React.useMemo(() => {
    if (filter === "all") return devices;
    if (filter === "on")
      return devices.filter((d) => d.status === "idle" || d.status === "on_duty");
    return devices.filter((d) => d.status === filter);
  }, [devices, filter]);

  return (
    <Card className="bg-white dark:bg-[var(--card)]">
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <CardTitle className="text-base sm:text-lg">
              Peta Lokasi Mesin
            </CardTitle>
          </div>

          <div className="flex flex-wrap gap-1">
            {toggleFilters.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(f.value)}
                className={cn(
                  "rounded-lg h-6 sm:h-7 text-[10px] sm:text-xs px-2",
                  filter === f.value
                    ? "bg-slate-600 text-white"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4">
        <div className="rounded-xl border bg-muted/30 p-2">
          <div className="relative w-full">
            {/* DENAH */}
            <img
              src={DenahSvg}
              alt="Denah workshop"
              className="block w-full h-auto rounded-lg"
            />

            {/* DOT DEVICE */}
            {filteredDevices.map((device, index) => {
              const locKey = normalizeLocation(device.location);

              if (!locKey) return null;

              const pos = MAP_POSITIONS[locKey as keyof typeof MAP_POSITIONS];

              if (!pos) return null;

              if (!pos) return null;

              const { dx, dy } = getDotOffset(index);

              return (
                <button
                  key={device.id}
                  type="button"
                  title={device.id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2",
                    "flex items-center justify-center",
                    "rounded-md border-2 border-white shadow-md",
                    "text-[9px] sm:text-[11px] font-semibold text-slate-900",
                    "min-w-[42px] sm:min-w-[56px]",
                    "h-6 sm:h-8",
                    "px-1.5 sm:px-2",
                    "hover:scale-105 transition-transform",
                    getStatusColor(device.status)
                  )}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    marginLeft: `${dx}px`,
                    marginTop: `${dy}px`,
                  }}
                  onClick={() => onSelect(device)}
                >
                  <span className="truncate max-w-[70px]">
                    {device.id.split(" - ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}