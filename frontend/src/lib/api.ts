import type { ApiResponse, Stats } from "@/types/api";
import type { Device } from "@/types/device";
import { http } from "@/lib/http";

const BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL?.toString().trim() ||
  "http://localhost:3001";

// Types for summary data
export interface DailySummary {
  device_id: string;
  summary: {
    idle_hours: string;
    onduty_hours: string;
    on_total_hours: string;
    off_hours: string;
    availability_percent: string;
  };
}

export interface SummaryRangeResponse {
  success: boolean;
  range?: { startDate: string; endDate: string };
  data: DailySummary[];
  message?: string;
}

export interface DeviceWithSummary extends Device {
  summary?: DailySummary["summary"];
}

export const api = {
  getStats: () => http<ApiResponse<Stats>>(`${BASE_URL}/api/stats`),

  getDevices: () => http<ApiResponse<Device[]>>(`${BASE_URL}/api/devices`),

  // Get daily summary - format tanggal: YYYY-MM-DD
  getDailySummary: (tanggal: string) =>
    http<ApiResponse<DailySummary[]>>(
      `${BASE_URL}/api/summary/harian/${tanggal}`,
    ),

  // Get weekly summary
  getWeeklySummary: () =>
    http<ApiResponse<DailySummary[]>>(`${BASE_URL}/api/summary/mingguan`),

  // Get monthly summary
  getMonthlySummary: () =>
    http<ApiResponse<DailySummary[]>>(`${BASE_URL}/api/summary/bulanan`),

// Get summary by date range
  getRangeSummary: (start: string, end: string) =>
    http<SummaryRangeResponse>(
      `${BASE_URL}/api/summary/range?start=${start}&end=${end}`,
    ),

  // Get operational hours
  getOperasional: () =>
    http<{ success: boolean; data: { start: string; end: string } }>(
      `${BASE_URL}/api/operasional`,
    ),

// Set operational hours
  setOperasional: (start: string, end: string) =>
    http<{ success: boolean; data: { start: string; end: string }; message?: string }>(
      `${BASE_URL}/api/operasional`,
      { method: "POST", body: JSON.stringify({ start, end }) },
    ),

  // Auth
  login: (username: string, password: string) =>
    http<{ success: boolean; message?: string }>(
      `${BASE_URL}/api/auth/login`,
      { method: "POST", body: JSON.stringify({ username, password }) },
    ),

  logout: () =>
    http<{ success: boolean; message?: string }>(
      `${BASE_URL}/api/auth/logout`,
      { method: "POST" },
    ),

  verifyAuth: () =>
    http<{ success: boolean; user?: { id: string; username: string }; message?: string }>(
      `${BASE_URL}/api/auth/me`,
    ),
};
