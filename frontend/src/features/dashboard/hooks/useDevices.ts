import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { on } from "@/lib/socket";
import { ALL_BRANCHES, useBranch, type DeviceScope } from "@/app/useBranch";

// Daftar mesin untuk satu cabang (default: cabang yang dipilih di topbar) atau ALL_BRANCHES untuk
// semua cabang; polling tiap 5 detik.
export function useDevices(scope?: DeviceScope) {
  const queryClient = useQueryClient();
  const { branchId } = useBranch();
  const effectiveScope = scope ?? branchId;

  const query = useQuery({
    queryKey: ["devices", effectiveScope],
    queryFn: () => (effectiveScope === ALL_BRANCHES ? api.getAllDevices() : api.getBranchDevices(effectiveScope)),
    refetchInterval: 5000,
  });

  // Seam untuk update realtime: saat ada push dari server, ambil ulang semua daftar mesin.
  useEffect(
    () => on("device:update", () => void queryClient.invalidateQueries({ queryKey: ["devices"] })),
    [queryClient],
  );

  return query;
}
