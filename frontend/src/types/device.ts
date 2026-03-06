export type DeviceStatus = "on_duty" | "idle" | "off" | string;

export type Device = {
  id: string;
  ipAddress?: string | null;
  lastSeen?: string | Date | null;

  status?: DeviceStatus | null;
  voltase?: number | null;
  arus?: number | null;
  suhu?: number | null;
  kelembapan?: number | null;

  thresholdIdle?: number | null;
  thresholdDuty?: number | null;
  
  location?: string | null; // W1, W2, W3, W4, W5, G1
  
  // Raw data from MQTT payload
  rawData?: {
    location?: string;
    data?: {
      voltase?: number;
      arus?: number;
      status_mesin?: string;
      suhu?: number;
      kelembapan?: number;
    };
    connection?: {
      ipaddress?: string;
      ts?: number;
    };
    threshold?: number;
  } | null;
};
