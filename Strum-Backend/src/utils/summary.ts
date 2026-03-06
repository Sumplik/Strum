import { prisma } from "../db.js";

export async function calculateSummary(
  deviceId: string,
  startDate: Date,
  endDate: Date,
) {
  const logs = await prisma.deviceLog.findMany({
    where: { deviceId, timestamp: { gte: startDate, lte: endDate } },
    orderBy: { timestamp: "asc" },
  });

  let idleHours = 0;
  let onDutyHours = 0;
  let offHours = 0;

  // Ambil config operasional (default 08:00 - 17:00 jika belum di set)
  const config = await prisma.appConfig.findUnique({
    where: { key: "operational_hours" },
  });
  const opsHours = config
    ? (config.value as { start: string; end: string })
    : { start: "08:00", end: "17:00" };

  const startHourNum = parseInt(opsHours.start.split(":")[0]);
  const endHourNum = parseInt(opsHours.end.split(":")[0]);
  const opsHoursPerDay = endHourNum - startHourNum;

  // Hitung durasi dari last log ke waktu sekarang (untuk real-time counting)
  const now = new Date();
  const effectiveEndDate = endDate > now ? now : endDate;

  if (logs.length > 0) {
    // Hitung durasi antar log
    for (let i = 0; i < logs.length - 1; i++) {
      const currentLog = logs[i];
      const nextLog = logs[i + 1];

      // Konversi milidetik ke Jam
      const diffHours =
        (nextLog.timestamp.getTime() - currentLog.timestamp.getTime()) /
        (1000 * 60 * 60);

      if (currentLog.status === "idle") idleHours += diffHours;
      else if (currentLog.status === "on_duty") onDutyHours += diffHours;
      else if (currentLog.status === "off") offHours += diffHours;
    }

    // Hitung durasi dari log terakhir sampai waktu sekarang (real-time)
    const lastLog = logs[logs.length - 1];
    const lastLogToNowHours =
      (effectiveEndDate.getTime() - lastLog.timestamp.getTime()) /
      (1000 * 60 * 60);

    if (lastLog.status === "idle") idleHours += lastLogToNowHours;
    else if (lastLog.status === "on_duty") onDutyHours += lastLogToNowHours;
    else if (lastLog.status === "off") offHours += lastLogToNowHours;
  }

  const onHours = idleHours + onDutyHours;

  // Hitung total hari dalam range
  const totalDays =
    Math.ceil(
      (effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) || 1;

  // Total jam operasional dalam range
  const totalOpsTime = opsHoursPerDay * totalDays;

  // Rumus Availability: (Waktu Ops - Downtime) / Waktu Ops
  let availability = 0;
  if (totalOpsTime > 0) {
    // Downtime adalah seberapa lama mesin OFF dalam jam operasional
    // Batasi offHours agar tidak melebihi totalOpsTime
    const effectiveOffHours = Math.min(offHours, totalOpsTime);
    availability = ((totalOpsTime - effectiveOffHours) / totalOpsTime) * 100;
  }

  return {
    idle_hours: idleHours.toFixed(2),
    onduty_hours: onDutyHours.toFixed(2),
    on_total_hours: onHours.toFixed(2),
    off_hours: offHours.toFixed(2),
    availability_percent: Math.max(0, Math.min(100, availability)).toFixed(2),
  };
}

