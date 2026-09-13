import * as React from "react";
import type { Device } from "@/types/device";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranch } from "@/app/useBranch";
import { BRANCH_MAPS } from "../config/branchMaps";
import { generateGridSlots } from "../config/mapRoomGrid";
import { statusLabel, type EffectiveDeviceStatus } from "@/features/dashboard/utils/deviceStatus";

export type MapFilter = "all" | "on" | "idle" | "on_duty" | "off";

interface MapLayoutProps {
  branchId: string;
  devices: Device[];
  filter: MapFilter;
  onFilterChange: (filter: MapFilter) => void;
  onSelect: (device: Device) => void;
}

const FILTERS: ReadonlyArray<{ value: MapFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "on", label: "ON" },
  { value: "idle", label: "Idle" },
  { value: "on_duty", label: "On Duty" },
  { value: "off", label: "OFF" },
];

function normalizeLocation(loc: string | null | undefined, roomKeys: readonly string[]) {
  if (!loc) return null;

  const compact = loc.trim().toUpperCase().replace(/[\s_\-/]+/g, "");
  return roomKeys.find((room) => compact.includes(room)) ?? null;
}

function getStatusColor(status: EffectiveDeviceStatus | null | undefined): string {
  switch (status) {
    case "on_duty":
      return "bg-green-300 dark:bg-green-400";
    case "idle":
      return "bg-blue-300 dark:bg-blue-400";
    case "off":
      return "bg-red-300 dark:bg-red-400";
    case "disconnect":
      return "bg-slate-300 dark:bg-slate-500 text-slate-700 dark:text-slate-100 opacity-80";
    default:
      return "bg-slate-300 dark:bg-slate-500";
  }
}

const DEVICE_CHIP_CLASS = cn(
  "flex items-center justify-center",
  "rounded-md border-2 border-white shadow-md",
  "text-[9px] sm:text-[11px] font-semibold",
  "min-w-[42px] sm:min-w-[56px]",
  "h-6 sm:h-8",
  "px-1.5 sm:px-2",
  "hover:scale-105 transition-transform",
);

function DeviceChip({
  device,
  status,
  onSelect,
  className,
  style,
  title,
}: {
  device: Device;
  status: EffectiveDeviceStatus;
  onSelect: (device: Device) => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? `${device.code} - ${statusLabel(status)}`}
      className={cn(DEVICE_CHIP_CLASS, getStatusColor(status), className)}
      style={style}
      onClick={() => onSelect(device)}
    >
      <span className="truncate max-w-[70px]">{device.code}</span>
    </button>
  );
}

export function MapLayout({
  branchId,
  devices,
  filter,
  onFilterChange,
  onSelect,
}: MapLayoutProps): React.ReactElement {
  const branchLabel = useBranch().branchLabel(branchId);
  const map = BRANCH_MAPS[branchId];
  const roomKeys = React.useMemo(() => (map ? Object.keys(map.rooms) : []), [map]);

  const filteredDevices = React.useMemo(() => {
    if (filter === "all") return devices;

    return devices.filter((d) => {
      if (filter === "on") {
        return d.effectiveStatus === "idle" || d.effectiveStatus === "on_duty";
      }
      return d.effectiveStatus === filter;
    });
  }, [devices, filter]);

  // Mesin yang lokasinya tidak cocok dengan ruangan mana pun di denah tetap ditampilkan di bawah peta.
  const { devicesByRoom, unplacedDevices } = React.useMemo(() => {
    const grouped: Record<string, Device[]> = {};
    const unplaced: Device[] = [];

    for (const device of filteredDevices) {
      const room = normalizeLocation(device.location, roomKeys);
      if (!room) {
        unplaced.push(device);
        continue;
      }

      (grouped[room] ??= []).push(device);
    }

    for (const room of Object.keys(grouped)) {
      grouped[room].sort((a, b) => a.code.localeCompare(b.code));
    }
    unplaced.sort((a, b) => a.code.localeCompare(b.code));

    return { devicesByRoom: grouped, unplacedDevices: unplaced };
  }, [filteredDevices, roomKeys]);

  const renderedDevices = React.useMemo(() => {
    const result: Array<{
      device: Device;
      x: number;
      y: number;
      overflow: boolean;
      room: string;
      slotIndex: number;
      effectiveStatus: EffectiveDeviceStatus;
    }> = [];

    if (!map) return result;

    for (const [room, roomDevices] of Object.entries(devicesByRoom)) {
      const config = map.rooms[room];

      if (!config) continue;

      const slots = generateGridSlots(config);

      roomDevices.forEach((device, index) => {
        const slot = slots[index];
        const { effectiveStatus } = device;

        if (slot) {
          result.push({
            device,
            x: slot.x,
            y: slot.y,
            overflow: false,
            room,
            slotIndex: index,
            effectiveStatus,
          });
        } else {
          const lastSlot = slots[slots.length - 1];
          if (!lastSlot) return;

          result.push({
            device,
            x: lastSlot.x,
            y: lastSlot.y,
            overflow: true,
            room,
            slotIndex: slots.length - 1,
            effectiveStatus,
          });
        }
      });
    }

    return result;
  }, [map, devicesByRoom]);

  return (
    <Card className="bg-white dark:bg-[var(--card)]">
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <CardTitle className="text-base sm:text-lg">
              Peta Lokasi Mesin
              <span className="ml-2 text-sm sm:text-base font-semibold text-muted-foreground">{branchLabel}</span>
            </CardTitle>
          </div>

          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
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
          {map ? (
            <div className="relative w-full">
              <img
                src={map.denah}
                alt={`Denah ${branchLabel}`}
                className="block w-full h-auto rounded-lg"
              />

              {renderedDevices.map(
                ({ device, x, y, overflow, room, slotIndex, effectiveStatus }) => (
                  <DeviceChip
                    key={device.id}
                    device={device}
                    status={effectiveStatus}
                    onSelect={onSelect}
                    title={
                      overflow
                        ? `${device.code} - ${room} (melewati kapasitas slot)`
                        : `${device.code} - ${room} - ${statusLabel(effectiveStatus)} - slot ${slotIndex + 1}`
                    }
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2",
                      overflow && "ring-2 ring-yellow-500"
                    )}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  />
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 px-4 text-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-semibold">Denah {branchLabel} belum tersedia</div>
              <p className="text-xs text-muted-foreground max-w-md">
                Tambahkan gambar denah dan posisi ruangan di{" "}
                <code className="text-[11px]">src/features/dashboard/config/branchMaps.ts</code>.
                Status mesin di cabang ini tetap ditampilkan di bawah.
              </p>
            </div>
          )}
        </div>

        {unplacedDevices.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              {map ? "Mesin tanpa posisi di denah" : "Mesin di cabang ini"} ({unplacedDevices.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {unplacedDevices.map((device) => (
                <DeviceChip
                  key={device.id}
                  device={device}
                  status={device.effectiveStatus}
                  onSelect={onSelect}
                  title={`${device.code} - ${device.location ?? "lokasi tidak diketahui"} - ${statusLabel(device.effectiveStatus)}`}
                />
              ))}
            </div>
          </div>
        )}

        {filteredDevices.length === 0 && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            {devices.length === 0
              ? `Belum ada mesin yang terdaftar di ${branchLabel}.`
              : "Tidak ada mesin yang cocok dengan filter ini."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
