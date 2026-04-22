import { Elysia, t } from "elysia";
import jwt from "@elysiajs/jwt";
import { prisma } from "../db";
import { calculateSummary } from "../utils/summary";

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export const apiRoutes = new Elysia({ prefix: "/api" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "SUPER_SECRET_KEY",
    }),
  )
  .derive(async ({ jwt, cookie: { auth_session }, set }) => {
    const profile = await jwt.verify(auth_session.value as string);
    if (!profile) {
      set.status = 401;
      throw new Error("Unauthorized");
    }
    return { user: profile };
  })

  // 1. Stats
  .get("/stats", async () => {
    const total = await prisma.device.count();
    const onDuty = await prisma.device.count({ where: { status: "on_duty" } });
    const idle = await prisma.device.count({ where: { status: "idle" } });
    const off = await prisma.device.count({ where: { status: "off" } });

    const disconnectThreshold = new Date(Date.now() - 6 * 60 * 1000);

    const online = await prisma.device.count({
      where: {
        lastSeen: {
          gt: disconnectThreshold,
        },
      },
    });

    const disconnect = total - online;

    const on = onDuty + idle;
    const percentOnDuty = on > 0 ? (onDuty / on) * 100 : 0;
    const percentIdle = on > 0 ? (idle / on) * 100 : 0;
    const percentOff = total > 0 ? (off / total) * 100 : 0;

    return {
      success: true,
      data: {
        total,
        on,
        idle,
        onDuty,
        off,
        online,
        disconnect,
        percentOnDuty: Number(percentOnDuty.toFixed(1)),
        percentIdle: Number(percentIdle.toFixed(1)),
        percentOff: Number(percentOff.toFixed(1)),
      },
    };
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

  // 3b. Get All Devices with Current Metadata
  .get("/devices-metadata", async () => {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: "desc" },
      select: {
        id: true,
        ipAddress: true,
        location: true,
        thresholdDuty: true,
        status: true,
        lastSeen: true,
      },
    });
    return { success: true, data: devices };
  })

  // 4. Summary Harian
  .get("/summary/harian/:tanggal", async ({ params: { tanggal } }) => {
    const startDate = new Date(`${tanggal}T00:00:00.000Z`);
    const endDate = new Date(`${tanggal}T23:59:59.999Z`);

    const devices = await prisma.device.findMany({
      select: { id: true, location: true, thresholdDuty: true, ipAddress: true },
    });

    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        current: {
          location: d.location,
          threshold: d.thresholdDuty,
          ipAddress: d.ipAddress,
        },
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );

    return { success: true, data: results };
  })

  // 5. Summary Mingguan
  .get("/summary/mingguan", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const devices = await prisma.device.findMany({
      select: { id: true, location: true, thresholdDuty: true, ipAddress: true },
    });

    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        current: {
          location: d.location,
          threshold: d.thresholdDuty,
          ipAddress: d.ipAddress,
        },
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );

    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 6. Summary Bulanan
  .get("/summary/bulanan", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1);

    const devices = await prisma.device.findMany({
      select: { id: true, location: true, thresholdDuty: true, ipAddress: true },
    });

    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        current: {
          location: d.location,
          threshold: d.thresholdDuty,
          ipAddress: d.ipAddress,
        },
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );

    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 6b. Summary by Date Range
  .get("/summary/range", async ({ query: { start, end } }) => {
    if (!start || !end) {
      return {
        success: false,
        message: "Parameter start dan end diperlukan (format YYYY-MM-DD)",
      };
    }

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    const devices = await prisma.device.findMany({
      select: { id: true, location: true, thresholdDuty: true, ipAddress: true },
    });

    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        current: {
          location: d.location,
          threshold: d.thresholdDuty,
          ipAddress: d.ipAddress,
        },
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );

    return {
      success: true,
      range: { startDate: start, endDate: end },
      data: results,
    };
  })

  // 7. Get Operasional
  .get("/set-operasional", async () => {
    const config = await prisma.appConfig.findUnique({
      where: { key: "operational_hours" },
    });

    const defaultOps = { start: "08:00", end: "17:00" };

    return {
      success: true,
      data: config
        ? (config.value as { start: string; end: string })
        : defaultOps,
    };
  })

  // 8. Set Operasional
  .post(
    "/set-operasional",
    async ({ body }) => {
      await prisma.appConfig.upsert({
        where: { key: "operational_hours" },
        update: { value: body },
        create: { key: "operational_hours", value: body },
      });

      return {
        success: true,
        message: "Jam operasional berhasil diubah",
        data: body,
      };
    },
    {
      body: t.Object({
        start: t.String({ description: "Format HH:mm misal 08:00" }),
        end: t.String({ description: "Format HH:mm misal 17:00" }),
      }),
    },
  )

  // 9. Download Logs (CSV/JSON export)
  .get(
    "/logs/download",
    async ({ query: { format, start, end, deviceId }, set }) => {
      if (!format || !["csv", "json"].includes(format)) {
        set.status = 400;
        return { success: false, message: 'Format must be "csv" or "json"' };
      }

      if (!start || !end) {
        set.status = 400;
        return {
          success: false,
          message: "start and end date (YYYY-MM-DD) required",
        };
      }

      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        set.status = 400;
        return {
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        };
      }

      const logs = await prisma.deviceLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
          ...(deviceId ? { deviceId } : {}),
        },
        include: {
          device: {
            select: {
              location: true,
            },
          },
        },
        orderBy: { timestamp: "asc" },
      });

      const filename = `strum-logs-${start}_to_${end}${deviceId ? `_${deviceId}` : ""}.${format}`;

      if (format === "json") {
        set.headers["Content-Type"] = "application/json; charset=utf-8";
        set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
        return logs;
      }

      const headers = [
        "ID",
        "Device ID",
        "Location",
        "Timestamp",
        "Status",
        "Created At",
        "Voltase",
        "Arus",
        "Suhu",
        "Kelembapan",
        "Status Mesin",
        "Version",
        "Threshold",
        "Connection Time",
        "IP Address",
      ];

      const lines: string[] = [];
      lines.push(headers.map(escapeCSV).join(","));

      for (const log of logs) {
        const raw = (log.rawData ?? {}) as any;
        const sensor = raw?.data ?? {};
        const connection = raw?.connection ?? {};

        const row = [
          log.id ?? "",
          log.deviceId ?? "",
          log.device?.location ?? raw?.location ?? "",
          log.timestamp ? new Date(log.timestamp).toISOString() : "",
          log.status ?? "",
          log.createdAt ? new Date(log.createdAt).toISOString() : "",
          sensor?.voltase ?? "",
          sensor?.arus ?? "",
          sensor?.suhu ?? "",
          sensor?.kelembapan ?? "",
          sensor?.status_mesin ?? "",
          raw?.version ?? "",
          raw?.threshold ?? "",
          connection?.ts ?? "",
          connection?.ipaddress ?? "",
        ];

        lines.push(row.map(escapeCSV).join(","));
      }

      // BOM added for better Excel compatibility
      const csv = "\uFEFF" + lines.join("\n");

      set.headers["Content-Type"] = "text/csv; charset=utf-8";
      set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
      return csv;
    },
    {
      query: t.Object({
        format: t.Union([t.Literal("csv"), t.Literal("json")]),
        start: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
        end: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
        deviceId: t.Optional(t.String()),
      }),
    },
  );