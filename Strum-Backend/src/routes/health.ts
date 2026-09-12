import { Elysia } from "elysia";
import { prisma } from "../db";
import { config } from "../config";
import { ingestionStats } from "../services/ingestion";
import { getMqttState } from "../mqtt";

const startedAt = Date.now();

export const healthRoutes = new Elysia({ prefix: "/api" }).get("/health", async ({ set }) => {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const mqtt = getMqttState();
  const healthy = database === "ok";
  if (!healthy) set.status = 503;

  return {
    success: healthy,
    data: {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timezone: config.timezone,
      database,
      mqtt,
      ingestion: ingestionStats,
    },
  };
});
