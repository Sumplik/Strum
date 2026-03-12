import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { on } from "@/lib/socket";
import type { Stats } from "@/types/api";

export function useStats() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  });

  // Listen for real-time stats updates (no-op when socket disabled)
  useEffect(() => {
    const unsubscribe = on("stats:update", (message: any) => {
      // Handle both direct data or wrapped format { type, data }
      const newStats = message?.data || message;
      
      queryClient.setQueryData<{ success: boolean; data: Stats }>(["stats"], (old) => {
        if (!old?.data) return old;
        return { ...old, data: newStats };
      });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}

