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