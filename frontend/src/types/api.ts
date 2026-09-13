import type { Device } from "./device";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFail = { success: false; message?: string };

export type ApiResponse<T> = ApiSuccess<T> | ApiFail;

// User yang sedang login (POST /api/auth/login, GET /api/auth/me)
export interface SessionUser {
  id: string;
  username: string;
}

export interface OperationalHours {
  start: string;
  end: string;
}

// Cabang dari GET /api/branches
export interface Branch {
  id: string; // UP2W1 .. UP2W6
  name: string;
  operationalHours: OperationalHours;
  deviceCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Ringkasan uptime satu mesin (satuan jam, desimal) dari GET /api/branches/:branchId/summary
export interface DeviceSummary {
  onDutyHours: number;
  idleHours: number;
  onTotalHours: number;
  offHours: number;
  disconnectHours: number;
  operationalOnHours: number;
  operationalIdleHours: number;
  operationalOffHours: number;
  operationalDisconnectHours: number;
  totalOperationalHours: number;
  availabilityPercent: number;
}

export interface DeviceSummaryRow {
  device: Device;
  summary: DeviceSummary;
}

// GET /api/branches/:branchId/summary
export interface SummaryReport {
  branchId: string;
  range: { start: string; end: string; effectiveEnd: string };
  operationalHours: OperationalHours;
  devices: DeviceSummaryRow[];
  averageAvailabilityPercent: number;
}

// GET /api/summary — semua cabang; jam operasional masing-masing cabang ada di `branches`
export interface MultiBranchSummaryReport {
  range: { start: string; end: string; effectiveEnd: string };
  branches: Array<{ branchId: string; operationalHours: OperationalHours; averageAvailabilityPercent: number }>;
  devices: DeviceSummaryRow[];
  averageAvailabilityPercent: number;
}
