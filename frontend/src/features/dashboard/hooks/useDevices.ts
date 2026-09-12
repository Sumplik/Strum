import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { on } from "@/lib/socket";
import type { ApiResponse } from "@/types/api";
import type { Device } from "@/types/device";

interface DeviceUpdate {
  device_id: string;
  status?: string | null;
  lastSeen?: string | Date | null;
  location?: string | null;
  voltase?: number | null;
  arus?: number | null;
  suhu?: number | null;
  kelembapan?: number | null;
}

function unwrap(message: unknown): DeviceUpdate | null {
  const payload = (message as { data?: unknown })?.data ?? message;
  return payload && typeof payload === "object" && "device_id" in payload
    ? (payload as DeviceUpdate)
    : null;
}

function applyUpdate(devices: Device[], update: DeviceUpdate): Device[] {
  const index = devices.findIndex((d) => d.id === update.device_id);
  const lastSeen = update.lastSeen ? new Date(update.lastSeen) : undefined;

  if (index < 0) {
    return [
      ...devices,
      {
        id: update.device_id,
        status: update.status,
        lastSeen: lastSeen ?? new Date(),
        location: update.location ?? null,
        voltase: update.voltase ?? null,
        arus: update.arus ?? null,
        suhu: update.suhu ?? null,
        kelembapan: update.kelembapan ?? null,
        ipAddress: null,
        thresholdIdle: null,
        thresholdDuty: null,
        rawData: null,
      },
    ];
  }

  const existing = devices[index];
  const next = [...devices];
  next[index] = {
    ...existing,
    status: update.status,
    lastSeen: lastSeen ?? existing.lastSeen,
    location: update.location ?? existing.location,
    voltase: update.voltase ?? existing.voltase,
    arus: update.arus ?? existing.arus,
    suhu: update.suhu ?? existing.suhu,
    kelembapan: update.kelembapan ?? existing.kelembapan,
  };
  return next;
}

export function useDevices() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["devices"],
    queryFn: api.getDevices,
    refetchInterval: 5000,
  });

  useEffect(
    () =>
      on("device:update", (message) => {
        const update = unwrap(message);
        if (!update) return;

        queryClient.setQueryData<ApiResponse<Device[]>>(["devices"], (old) => {
          if (!old?.success) return old;
          return { ...old, data: applyUpdate(old.data, update) };
        });
      }),
    [queryClient],
  );

  return query;
}
