import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: api.getDevices,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
