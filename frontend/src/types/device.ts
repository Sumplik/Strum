export type DeviceStatus = "on_duty" | "idle" | "off";

// Objek mesin dari GET /api/branches/:branchId/devices
export type Device = {
  id: string; // uuid internal
  branchId: string;
  code: string; // ID mesin, mis. 6CNC1 (unik per cabang)
  status: DeviceStatus;
  effectiveStatus: DeviceStatus | "disconnect";
  online: boolean;
  reportedStatus: string | null;
  lastSeen: string;
  location: string | null; // W1, W2, W3, W4, W5, G3, Ruang CNC, ...
  ipAddress: string | null;
  firmwareVersion: string | null;
  threshold: number | null;
  arus: number | null;
  voltase: number | null;
  suhu: number | null;
  kelembapan: number | null;
  createdAt: string;
  updatedAt: string;
};
