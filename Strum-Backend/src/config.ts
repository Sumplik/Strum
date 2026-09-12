const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://103.127.138.225:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://103.127.138.225:3000",
  "https://utilitasmesinpusharlis.id",
  "https://www.utilitasmesinpusharlis.id",
];

const FALLBACK_JWT_SECRET = "SUPER_SECRET_KEY";

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

const isProduction = process.env.NODE_ENV === "production";
const corsFromEnv = parseList(process.env.CORS_ORIGINS);
const legacyBranchId = (process.env.LEGACY_BRANCH_ID || "UP2W6").replace(/\s+/g, "").toUpperCase();

export const config = {
  isProduction,
  port: parsePort(process.env.PORT, 3001),
  timezone: process.env.TIMEZONE || "Asia/Jakarta",
  jwtSecret: process.env.JWT_SECRET || FALLBACK_JWT_SECRET,
  isJwtSecretFallback: !process.env.JWT_SECRET,
  cookieSecure: parseBool(process.env.COOKIE_SECURE, isProduction),
  corsOrigins: corsFromEnv.length > 0 ? corsFromEnv : DEFAULT_CORS_ORIGINS,
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    topicRoot: "mesin/telemetry",
    // Devices still publishing to mesin/telemetry or mesin/telemetry/<deviceId> land in this branch.
    legacyBranchId,
  },
};

export const TELEMETRY_INTERVAL_MINUTES = 3;
export const DISCONNECT_TIMEOUT_MS = TELEMETRY_INTERVAL_MINUTES * 2 * 60 * 1000;

export const SESSION_MAX_AGE_SECONDS = 7 * 86400;
export const MAX_SUMMARY_RANGE_DAYS = 93;
export const MAX_EXPORT_RANGE_DAYS = 93;
export const MAX_XLSX_ROWS = 200_000;
