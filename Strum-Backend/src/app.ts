import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Prisma } from "@prisma/client";
import { config } from "./config";
import { HttpError } from "./lib/errors";
import { requireAuth } from "./plugins/auth";
import { authRoutes } from "./routes/auth";
import { branchRoutes, overviewRoutes } from "./routes/branches";
import { deviceRoutes } from "./routes/devices";
import { exportRoutes } from "./routes/exports";
import { healthRoutes } from "./routes/health";

function fail(set: { status?: number | string }, status: number, message: string, details?: unknown) {
  set.status = status;
  return { success: false, message, ...(details !== undefined ? { details } : {}) };
}

const protectedApi = new Elysia({ prefix: "/api" })
  .use(requireAuth)
  .use(overviewRoutes)
  .use(branchRoutes)
  .use(deviceRoutes)
  .use(exportRoutes);

export function createApp() {
  return new Elysia()
    .onError(({ code, error, set }) => {
      if (error instanceof HttpError) return fail(set, error.status, error.message, error.details);

      if (code === "VALIDATION") {
        const first = error.all?.[0];
        const detail = first && "path" in first ? `${first.path}: ${first.message}` : error.message;
        return fail(set, 400, "Validasi gagal", detail);
      }
      if (code === "NOT_FOUND") return fail(set, 404, "Endpoint tidak ditemukan");
      if (code === "PARSE") return fail(set, 400, "Body request bukan JSON valid");

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") return fail(set, 409, "Data sudah ada (duplikat)");
        if (error.code === "P2025") return fail(set, 404, "Data tidak ditemukan");
      }

      console.error("❌ Unhandled error:", error);
      return fail(set, 500, "Terjadi kesalahan internal");
    })
    .use(cors({ origin: config.corsOrigins, credentials: true }))
    .use(healthRoutes)
    .use(authRoutes)
    .use(protectedApi);
}

export type App = ReturnType<typeof createApp>;
