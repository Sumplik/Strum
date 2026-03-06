export type ApiSuccess<T> = { success: true; data: T };
export type ApiFail = { success: false; message?: string };

export type ApiResponse<T> = ApiSuccess<T> | ApiFail;

export type Stats = {
  total: number;
  onDuty: number;
  idle: number;
  off: number;
};