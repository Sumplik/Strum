import DenahSvg from "@/assets/images/denah.svg";
import * as React from "react";
import type { Device } from "@/types/device";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROOM_GRID_CONFIG, generateGridSlots } from "../config/mapRoomGrid";
import {
  getEffectiveStatus,
  statusLabel,
  type EffectiveDeviceStatus,
} from "@/features/dashboard/utils/deviceStatus";

export type MapFilter = "all" | "on" | "idle" | "on_duty" | "off";

interface MapLayoutProps {
  devices: Device[];
  filter: MapFilter;
  onFilterChange: (filter: MapFilter) => void;
  onSelect: (device: Device) => void;
}

const ROOM_KEYS = ["CNC", "W1", "W2", "W3", "W4", "W5", "G3"] as const;

const FILTERS: ReadonlyArray<{ value: MapFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "on", label: "ON" },
  { value: "idle", label: "Idle" },
  { value: "on_duty", label: "On Duty" },
  { value: "off", label: "OFF" },
];

function normalizeLocation(loc?: string | null) {
  if (!loc) return null;

  const compact = loc.trim().toUpperCase().replace(/[\s_\-/]+/g, "");
  return ROOM_KEYS.find((room) => compact.includes(room)) ?? null;
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

export function MapLayout({
  devices,
  filter,
  onFilterChange,
  onSelect,
}: MapLayoutProps): React.ReactElement {
  const filteredDevices = React.useMemo(() => {
    if (filter === "all") return devices;

    return devices.filter((d) => {
      const effectiveStatus = getEffectiveStatus(d);

      if (filter === "on") {
        return effectiveStatus === "idle" || effectiveStatus === "on_duty";
      }

      return effectiveStatus === filter;
    });
  }, [devices, filter]);

  const devicesByRoom = React.useMemo(() => {
    const grouped: Record<string, Device[]> = {};

    for (const device of filteredDevices) {
      const room = normalizeLocation(device.location);
      if (!room) continue;

      if (!grouped[room]) {
        grouped[room] = [];
      }

      grouped[room].push(device);
    }

    for (const room of Object.keys(grouped)) {
      grouped[room].sort((a, b) => a.id.localeCompare(b.id));
    }

    return grouped;
  }, [filteredDevices]);

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

    for (const [room, roomDevices] of Object.entries(devicesByRoom)) {
      const config = ROOM_GRID_CONFIG[room];

      if (!config) continue;

      const slots = generateGridSlots(config);

      roomDevices.forEach((device, index) => {
        const slot = slots[index];
        const effectiveStatus = getEffectiveStatus(device);

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
  }, [devicesByRoom]);

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
          <div className="relative w-full">
            <img
              src={DenahSvg}
              alt="Denah workshop"
              className="block w-full h-auto rounded-lg"
            />

            {renderedDevices.map(
              ({ device, x, y, overflow, room, slotIndex, effectiveStatus }) => (
                <button
                  key={device.id}
                  type="button"
                  title={
                    overflow
                      ? `${device.id} - ${room} (melewati kapasitas slot)`
                      : `${device.id} - ${room} - ${
                          effectiveStatus === "disconnect" ? statusLabel(effectiveStatus) : effectiveStatus
                        } - slot ${slotIndex + 1}`
                  }
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2",
                    "flex items-center justify-center",
                    "rounded-md border-2 border-white shadow-md",
                    "text-[9px] sm:text-[11px] font-semibold",
                    "min-w-[42px] sm:min-w-[56px]",
                    "h-6 sm:h-8",
                    "px-1.5 sm:px-2",
                    "hover:scale-105 transition-transform",
                    getStatusColor(effectiveStatus),
                    overflow && "ring-2 ring-yellow-500"
                  )}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  onClick={() => onSelect(device)}
                >
                  <span className="truncate max-w-[70px]">
                    {device.id.split(" - ")[0]}
                  </span>
                </button>
              )
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  );
}