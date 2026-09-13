import { useQuery } from "@tanstack/react-query";
import { ALL_BRANCHES, type DeviceScope } from "@/app/useBranch";
import { api } from "@/lib/api";
import { queryErrorMessage } from "@/lib/query";
import type { ApiResponse, DeviceSummaryRow, OperationalHours } from "@/types/api";

// Bentuk seragam untuk summary satu cabang maupun semua cabang.
interface SummaryView {
  rows: DeviceSummaryRow[];
  averageAvailabilityPercent: number;
  // null saat semua cabang: jam operasional berbeda per cabang.
  operationalHours: OperationalHours | null;
}

async function fetchSummary(scope: DeviceScope, start: string, end: string): Promise<ApiResponse<SummaryView>> {
  if (scope === ALL_BRANCHES) {
    const response = await api.getAllBranchesSummary(start, end);
    if (!response.success) return response;
    const { devices, averageAvailabilityPercent } = response.data;
    return { success: true, data: { rows: devices, averageAvailabilityPercent, operationalHours: null } };
  }

  const response = await api.getBranchSummary(scope, start, end);
  if (!response.success) return response;
  const { devices, averageAvailabilityPercent, operationalHours } = response.data;
  return { success: true, data: { rows: devices, averageAvailabilityPercent, operationalHours } };
}

// Uptime/availability per mesin untuk cakupan cabang dan rentang hari kalender (inklusif, YYYY-MM-DD).
export function useSummary(scope: DeviceScope, start: string, end: string) {
  const query = useQuery({
    queryKey: ["summary", scope, start, end],
    queryFn: () => fetchSummary(scope, start, end),
  });

  const view = query.data?.success ? query.data.data : null;

  return {
    query,
    rows: view?.rows ?? [],
    averageAvailabilityPercent: view?.averageAvailabilityPercent ?? 0,
    operationalHours: view?.operationalHours ?? null,
    errorMessage: queryErrorMessage(query, "Gagal memuat summary"),
  };
}
