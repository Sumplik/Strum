import type {
  ApiResponse,
  DeviceSummaryRow,
  OperationalHours,
  Stats,
  SummaryRangeResponse,
} from "@/types/api";
import type { Device } from "@/types/device";
import { http } from "@/lib/http";

// TODO: drop the hardcoded production fallback once every deployment sets VITE_API_BASE_URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://103.127.138.225:3001";

type LogFormat = "csv" | "json";

type MessageResponse = { success: boolean; message?: string };

export const api = {
  getStats: () => http<ApiResponse<Stats>>(`${BASE_URL}/api/stats`),

  getDevices: () => http<ApiResponse<Device[]>>(`${BASE_URL}/api/devices`),

  getDailySummary: (tanggal: string) =>
    http<ApiResponse<DeviceSummaryRow[]>>(`${BASE_URL}/api/summary/harian/${tanggal}`),

  getWeeklySummary: () =>
    http<ApiResponse<DeviceSummaryRow[]>>(`${BASE_URL}/api/summary/mingguan`),

  getMonthlySummary: () =>
    http<ApiResponse<DeviceSummaryRow[]>>(`${BASE_URL}/api/summary/bulanan`),

  getRangeSummary: (start: string, end: string) =>
    http<SummaryRangeResponse>(`${BASE_URL}/api/summary/range?start=${start}&end=${end}`),

  getOperasional: () =>
    http<{ success: boolean; data: OperationalHours }>(`${BASE_URL}/api/set-operasional`),

  setOperasional: (start: string, end: string) =>
    http<{ success: boolean; data: OperationalHours; message?: string }>(
      `${BASE_URL}/api/set-operasional`,
      { method: "POST", body: JSON.stringify({ start, end }) },
    ),

  login: (username: string, password: string) =>
    http<MessageResponse>(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => http<MessageResponse>(`${BASE_URL}/api/auth/logout`, { method: "POST" }),

  verifyAuth: () =>
    http<MessageResponse & { user?: { id: string; username: string } }>(
      `${BASE_URL}/api/auth/me`,
    ),

  downloadLogs: async (format: LogFormat, start: string, end: string, deviceId?: string) => {
    const params = new URLSearchParams({ format, start, end });
    if (deviceId) params.append("deviceId", deviceId);

    const response = await fetch(`${BASE_URL}/api/logs/download?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const filename =
      response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ||
      `logs-${start}_to_${end}.${format}`;

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  },
};
