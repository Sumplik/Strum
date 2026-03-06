import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { calculateSummary } from "../utils/summary";

// Semua routes adalah PUBLIC (tanpa autentikasi)
export const apiRoutes = new Elysia({ prefix: "/api" })
  // 1. Stats
  .get("/stats", async () => {
    const total = await prisma.device.count();
    const onDuty = await prisma.device.count({ where: { status: "on_duty" } });
    const idle = await prisma.device.count({ where: { status: "idle" } });
    const off = await prisma.device.count({ where: { status: "off" } });
    return { success: true, data: { total, onDuty, idle, off } };
  })

  // 2. Device List
  .get("/devices", async () => {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: "desc" },
    });
    return { success: true, data: devices };
  })

  // 3. Device Detail
  .get("/devices/:id", async ({ params: { id } }) => {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) return { success: false, message: "Device tidak ditemukan" };
    return { success: true, data: device };
  })

  // 4. Summary Range (HARUS di atas harian)
  .get("/summary/range", async ({ query }) => {
    const { start, end } = query as { start?: string; end?: string };
    if (!start || !end) {
      return { success: false, message: "Parameter start dan end diperlukan" };
    }
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);
    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 5. Summary Harian
  .get("/summary/harian/:tanggal", async ({ params: { tanggal } }) => {
    const startDate = new Date(`${tanggal}T00:00:00.000Z`);
    const endDate = new Date(`${tanggal}T23:59:59.999Z`);
    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, data: results };
  })

  // 6. Summary Mingguan
  .get("/summary/mingguan", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 7. Summary Bulanan
  .get("/summary/bulanan", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1);
    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 8. Get Operational Hours
  .get("/operasional", async () => {
    const config = await prisma.appConfig.findUnique({
      where: { key: "operational_hours" },
    });
    if (!config) {
      return {
        success: true,
        data: { start: "08:00", end: "17:00" }
      };
    }
    return { success: true, data: config.value };
  })

  // 9. Set Operational Hours
  .post("/operasional", async ({ body }) => {
    const { start, end } = body as { start?: string; end?: string };
    
    if (!start || !end) {
      return { success: false, message: "Parameter start dan end diperlukan" };
    }

    // Validasi format jam (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      return { success: false, message: "Format jam harus HH:MM" };
    }

    const config = await prisma.appConfig.upsert({
      where: { key: "operational_hours" },
      update: { value: { start, end } },
      create: { key: "operational_hours", value: { start, end } },
    });

    return { success: true, data: config.value };
  }, {
    body: t.Object({
      start: t.String(),
      end: t.String(),
    })
  });

