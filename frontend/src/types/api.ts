export type ApiSuccess<T> = { success: true; data: T };
export type ApiFail = { success: false; message?: string };

export type ApiResponse<T> = ApiSuccess<T> | ApiFail;

export interface Stats {
  total: number;
  on: number;
  idle: number;
  onDuty: number;
  off: number;
  online: number;
  disconnect: number;
  percentOnDuty: number;
  percentIdle: number;
  percentOff: number;
}

export interface OperationalHours {
  start: string;
  end: string;
}

export interface DeviceSummary {
  idle_hours: string;
  onduty_hours: string;
  on_total_hours: string;
  off_hours: string;
  disconnect_hours: string;

  operational_on_hours: string;
  operational_off_hours: string;
  operational_idle_hours: string;
  operational_disconnect_hours: string;

  total_operational_hours: string;
  availability_percent: string;
}

export interface DeviceSummaryRow {
  device_id: string;
  current?: {
    location: string | null;
    threshold: number | null;
    ipAddress: string | null;
  };
  summary: DeviceSummary;
}

export interface SummaryRangeResponse {
  success: boolean;
  range?: { startDate: string; endDate: string };
  data: DeviceSummaryRow[];
  message?: string;
}
