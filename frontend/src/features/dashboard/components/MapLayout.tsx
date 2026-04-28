import DenahSvg from "@/assets/images/denah.svg";
import * as React from "react";
import type { Device, DeviceStatus } from "@/types/device";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ROOM_GRID_CONFIG,
  generateGridSlots,
} from "../config/mapRoomGrid";

const DISCONNECT_TIMEOUT_MS = 6 * 60 * 1000;

type EffectiveDeviceStatus = DeviceStatus | "disconnect";

interface MapLayoutProps {
  devices: Device[];
  filter: "all" | "on" | "idle" | "on_duty" | "off";
  onFilterChange: (filter: "all" | "on" | "idle" | "on_duty" | "off") => void;
  onSelect: (device: Device) => void;
}

function getLastSeen(device: any) {
  return (
    device.lastSeen ??
    device.last_seen ??
    device.lastUpdate ??
    device.updated_at ??
    null
  );
}

function isDeviceOnline(lastSeen: unknown): boolean {
  if (!lastSeen) return false;

  const ts = new Date(lastSeen as string | Date).getTime();
  if (Number.isNaN(ts)) return false;

  return Date.now() - ts <= DISCONNECT_TIMEOUT_MS;
}

function getEffectiveStatus(device: Device): EffectiveDeviceStatus {
  if (!isDeviceOnline(getLastSeen(device))) {
    return "disconnect";
  }

  if (
    device.status === "on_duty" ||
    device.status === "idle" ||
    device.status === "off"
  ) {
    return device.status;
  }

  return "disconnect";
}

function normalizeLocation(loc?: string | null) {
  if (!loc) return null;

  const value = loc.trim().toUpperCase();
  const compact = value.replace(/[\s_\-\/]+/g, "");

  if (compact.includes("CNC")) return "CNC";
  if (compact.includes("W1")) return "W1";
  if (compact.includes("W2")) return "W2";
  if (compact.includes("W3")) return "W3";
  if (compact.includes("W4")) return "W4";
  if (compact.includes("W5")) return "W5";
  if (compact.includes("G3")) return "G3";

  return null;
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
  const toggleFilters = [
    { value: "all", label: "Semua" },
    { value: "on", label: "ON" },
    { value: "idle", label: "Idle" },
    { value: "on_duty", label: "On Duty" },
    { value: "off", label: "OFF" },
  ] as const;

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
                          effectiveStatus === "disconnect"
                            ? "Disconnect"
                            : effectiveStatus
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

            {/* DEBUG SLOT GRID - aktifkan sementara kalau mau cek posisi slot */}
            {/*
            {Object.entries(ROOM_GRID_CONFIG).flatMap(([room, config]) =>
              generateGridSlots(config).map((slot, index) => (
                <div
                  key={`${room}-${index}`}
                  className="absolute rounded-md border border-yellow-600 bg-yellow-300/40"
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: `${config.boxWidth ?? 30}px`,
                    height: `${config.boxHeight ?? 18}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={`${room} - slot ${index + 1}`}
                />
              ))
            )}
            */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}