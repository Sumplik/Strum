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

  // Helper: hitung jam operasional dalam satu hari (dari config)
  const opsStartHour = startHourNum;
  const opsEndHour = endHourNum;

  // Helper: hitung overlap antara periode log dengan jam operasional
  function calculateOperationalHours(
    logStart: Date,
    logEnd: Date,
    status: string
  ): { onOps: number; offOps: number; idleOps: number } {
    let onOps = 0;
    let offOps = 0;
    let idleOps = 0;

    // Get the operational time window for each day in the period
    let currentDate = new Date(logStart);
    currentDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(logEnd);
    endDate.setHours(0, 0, 0, 0);

    // Iterate through each day
    while (currentDate <= endDate) {
      // Operational hours for this specific day (local time)
      const dayOpsStart = new Date(currentDate);
      dayOpsStart.setHours(opsStartHour, 0, 0, 0);
      
      const dayOpsEnd = new Date(currentDate);
      dayOpsEnd.setHours(opsEndHour, 0, 0, 0);

      // Calculate overlap between log period and operational hours
      const overlapStart = Math.max(logStart.getTime(), dayOpsStart.getTime());
      const overlapEnd = Math.min(logEnd.getTime(), dayOpsEnd.getTime());
      
      const overlapHours = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60));

      if (overlapHours > 0) {
        if (status === "idle") {
          idleOps += overlapHours;
        } else if (status === "on_duty") {
          onOps += overlapHours;
        } else {
          offOps += overlapHours;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { onOps, offOps, idleOps };
  }

  let operationalOnHours = 0;
  let operationalOffHours = 0;
  let operationalIdleHours = 0;

  if (logs.length > 0) {
    // Hitung durasi antar log
    for (let i = 0; i < logs.length - 1; i++) {
      const currentLog = logs[i];
      const nextLog = logs[i + 1];

      const opsHours = calculateOperationalHours(
        currentLog.timestamp,
        nextLog.timestamp,
        currentLog.status
      );

      if (currentLog.status === "idle") {
        idleHours += (nextLog.timestamp.getTime() - currentLog.timestamp.getTime()) / (1000 * 60 * 60);
        operationalIdleHours += opsHours.idleOps;
      } else if (currentLog.status === "on_duty") {
        onDutyHours += (nextLog.timestamp.getTime() - currentLog.timestamp.getTime()) / (1000 * 60 * 60);
        operationalOnHours += opsHours.onOps;
      } else if (currentLog.status === "off") {
        offHours += (nextLog.timestamp.getTime() - currentLog.timestamp.getTime()) / (1000 * 60 * 60);
        operationalOffHours += opsHours.offOps;
      }
    }

    // Hitung durasi dari log terakhir sampai waktu sekarang (real-time)
    const lastLog = logs[logs.length - 1];
    const lastLogToNow = effectiveEndDate;

    const opsHoursLast = calculateOperationalHours(
      lastLog.timestamp,
      lastLogToNow,
      lastLog.status
    );

    if (lastLog.status === "idle") {
      idleHours += (lastLogToNow.getTime() - lastLog.timestamp.getTime()) / (1000 * 60 * 60);
      operationalIdleHours += opsHoursLast.idleOps;
    } else if (lastLog.status === "on_duty") {
      onDutyHours += (lastLogToNow.getTime() - lastLog.timestamp.getTime()) / (1000 * 60 * 60);
      operationalOnHours += opsHoursLast.onOps;
    } else if (lastLog.status === "off") {
      offHours += (lastLogToNow.getTime() - lastLog.timestamp.getTime()) / (1000 * 60 * 60);
      operationalOffHours += opsHoursLast.offOps;
    }
  }

  // Total ON dalam jam operasional
  const operationalOnTime = operationalOnHours + operationalIdleHours;
  const onHours = idleHours + onDutyHours;

  // Hitung total hari dalam range
  const totalDays =
    Math.ceil(
      (effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) || 1;

  // Total jam operasional dalam range
  const totalOpsTime = opsHoursPerDay * totalDays;

  // Rumus Availability: ON / jam operasional × 100
  let availability = 0;
  if (totalOpsTime > 0) {
    availability = (operationalOnTime / totalOpsTime) * 100;
  }

  return {
    idle_hours: idleHours.toFixed(2),
    onduty_hours: onDutyHours.toFixed(2),
    on_total_hours: onHours.toFixed(2),
    off_hours: offHours.toFixed(2),
    // Tambahan: operational hours breakdown untuk debugging/display
    operational_on_hours: operationalOnTime.toFixed(2),
    operational_off_hours: operationalOffHours.toFixed(2),
    operational_idle_hours: operationalIdleHours.toFixed(2),
    total_operational_hours: totalOpsTime.toFixed(2),
    availability_percent: Math.max(0, Math.min(100, availability)).toFixed(2),
  };
}

