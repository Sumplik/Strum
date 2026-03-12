import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { on } from "@/lib/socket";
import type { Device } from "@/types/device";

export function useDevices() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["devices"],
    queryFn: api.getDevices,
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  });

  // Listen for real-time device updates (no-op when socket disabled)
  useEffect(() => {
    const unsubscribe = on("device:update", (message: any) => {
      // Handle both direct data or wrapped format { type, data }
      const updatedDevice = message?.data || message;
      
      queryClient.setQueryData<{ success: boolean; data: Device[] }>(["devices"], (old) => {
        if (!old?.data) return old;
        
        const index = old.data.findIndex((d) => d.id === updatedDevice.device_id);
        if (index >= 0) {
          // Update existing device
          const newDevices = [...old.data];
          newDevices[index] = {
            ...newDevices[index],
            id: updatedDevice.device_id,
            status: updatedDevice.status as any,
            lastSeen: updatedDevice.lastSeen ? new Date(updatedDevice.lastSeen) : newDevices[index].lastSeen,
            location: updatedDevice.location ?? newDevices[index].location,
            voltase: updatedDevice.voltase ?? newDevices[index].voltase,
            arus: updatedDevice.arus ?? newDevices[index].arus,
            suhu: updatedDevice.suhu ?? newDevices[index].suhu,
            kelembapan: updatedDevice.kelembapan ?? newDevices[index].kelembapan,
          };
          return { ...old, data: newDevices };
        } else {
          // Add new device
          return {
            ...old,
            data: [...old.data, {
              id: updatedDevice.device_id,
              status: updatedDevice.status as any,
              lastSeen: updatedDevice.lastSeen ? new Date(updatedDevice.lastSeen) : new Date(),
              location: updatedDevice.location ?? null,
              voltase: updatedDevice.voltase ?? null,
              arus: updatedDevice.arus ?? null,
              suhu: updatedDevice.suhu ?? null,
              kelembapan: updatedDevice.kelembapan ?? null,
              ipAddress: null,
              thresholdIdle: null,
              thresholdDuty: null,
              rawData: null,
            }],
          };
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}

