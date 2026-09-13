import type {
  ApiResponse,
  Branch,
  MultiBranchSummaryReport,
  OperationalHours,
  SessionUser,
  SummaryReport,
} from "@/types/api";
import type { Device } from "@/types/device";
import { ALL_BRANCHES, type DeviceScope } from "@/app/useBranch";
import { http, HttpError } from "@/lib/http";

// TODO: drop the hardcoded production fallback once every deployment sets VITE_API_BASE_URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://103.127.138.225:3001";

// Batas rentang summary/export di backend (MAX_SUMMARY_RANGE_DAYS / MAX_EXPORT_RANGE_DAYS).
export const MAX_SUMMARY_RANGE_DAYS = 93;

type MessageResponse = { success: boolean; message?: string };

const branchUrl = (branchId: string) => `${BASE_URL}/api/branches/${encodeURIComponent(branchId)}`;

export interface LogExportParams {
  // ALL_BRANCHES (semua cabang) atau ID satu cabang.
  scope: DeviceScope;
  // Hanya untuk scope satu cabang: ekspor log mesin ini saja.
  code?: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    let message = `Download gagal (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Body bukan JSON; pakai pesan default.
    }
    throw new HttpError(message, response.status);
  }

  const blob = await response.blob();
  const filename =
    response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || fallbackName;

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

export const api = {
  // --- Autentikasi ---
  login: (username: string, password: string) =>
    http<ApiResponse<SessionUser>>(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => http<MessageResponse>(`${BASE_URL}/api/auth/logout`, { method: "POST" }),

  verifyAuth: () => http<ApiResponse<SessionUser>>(`${BASE_URL}/api/auth/me`),

  // --- Cabang ---
  getBranches: () => http<ApiResponse<Branch[]>>(`${BASE_URL}/api/branches`),

  getBranch: (branchId: string) => http<ApiResponse<Branch>>(branchUrl(branchId)),

  updateBranchHours: (branchId: string, operationalHours: OperationalHours) =>
    http<ApiResponse<Branch>>(branchUrl(branchId), {
      method: "PATCH",
      body: JSON.stringify({ operationalHours }),
    }),

  // --- Mesin ---
  getBranchDevices: (branchId: string) => http<ApiResponse<Device[]>>(`${branchUrl(branchId)}/devices`),

  // Semua mesin di semua cabang (urut cabang lalu kode).
  getAllDevices: () => http<ApiResponse<Device[]>>(`${BASE_URL}/api/devices`),

  // --- Laporan (rentang hari kalender inklusif, maks 93 hari) ---
  getBranchSummary: (branchId: string, start: string, end: string) =>
    http<ApiResponse<SummaryReport>>(`${branchUrl(branchId)}/summary?${new URLSearchParams({ start, end })}`),

  getAllBranchesSummary: (start: string, end: string) =>
    http<ApiResponse<MultiBranchSummaryReport>>(`${BASE_URL}/api/summary?${new URLSearchParams({ start, end })}`),

  // Export log telemetri ke CSV: semua cabang, satu cabang, atau satu mesin (scope cabang + `code`).
  downloadLogsCsv: ({ scope, code, start, end }: LogExportParams) => {
    const base =
      scope === ALL_BRANCHES
        ? `${BASE_URL}/api`
        : code
          ? `${branchUrl(scope)}/devices/${encodeURIComponent(code)}`
          : branchUrl(scope);
    const target = scope === ALL_BRANCHES ? "SEMUA-CABANG" : code ? `${scope}_${code}` : scope;
    return downloadFile(
      `${base}/exports/logs?${new URLSearchParams({ format: "csv", start, end })}`,
      `strum-logs-${target}-${start}_${end}.csv`,
    );
  },
};
