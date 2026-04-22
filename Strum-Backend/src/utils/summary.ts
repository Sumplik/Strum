import { prisma } from "../db.js";

const TELEMETRY_INTERVAL_MINUTES = 3;
const DISCONNECT_TIMEOUT_MS = TELEMETRY_INTERVAL_MINUTES * 2 * 60 * 1000; // 6 menit

type MachineStatus = "idle" | "on_duty" | "off" | "disconnect";

export async function calculateSummary(
  deviceId: string,
  startDate: Date,
  endDate: Date,
) {
  const now = new Date();
  const effectiveEndDate = endDate > now ? now : endDate;

  const [previousLog, logsInRange, nextLogAfterRange, config] = await Promise.all([
    prisma.deviceLog.findFirst({
      where: {
        deviceId,
        timestamp: { lt: startDate },
      },
      orderBy: { timestamp: "desc" },
    }),
    prisma.deviceLog.findMany({
      where: {
        deviceId,
        timestamp: { gte: startDate, lte: effectiveEndDate },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.deviceLog.findFirst({
      where: {
        deviceId,
        timestamp: { gt: effectiveEndDate },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.appConfig.findUnique({
      where: { key: "operational_hours" },
    }),
  ]);

  const opsHours = config
    ? (config.value as { start: string; end: string })
    : { start: "08:00", end: "17:00" };

  const startHourNum = parseInt(opsHours.start.split(":")[0], 10);
  const endHourNum = parseInt(opsHours.end.split(":")[0], 10);
  const opsHoursPerDay = endHourNum - startHourNum;

  let idleHours = 0;
  let onDutyHours = 0;
  let offHours = 0;
  let disconnectHours = 0;

  let operationalOnHours = 0;
  let operationalOffHours = 0;
  let operationalIdleHours = 0;
  let operationalDisconnectHours = 0;

  function calculateOperationalHours(
    periodStart: Date,
    periodEnd: Date,
    status: MachineStatus
  ): { onOps: number; offOps: number; idleOps: number; disconnectOps: number } {
    let onOps = 0;
    let offOps = 0;
    let idleOps = 0;
    let disconnectOps = 0;

    let currentDate = new Date(periodStart);
    currentDate.setHours(0, 0, 0, 0);

    const periodEndDate = new Date(periodEnd);
    periodEndDate.setHours(0, 0, 0, 0);

    while (currentDate <= periodEndDate) {
      const dayOpsStart = new Date(currentDate);
      dayOpsStart.setHours(startHourNum, 0, 0, 0);

      const dayOpsEnd = new Date(currentDate);
      dayOpsEnd.setHours(endHourNum, 0, 0, 0);

      const overlapStart = Math.max(periodStart.getTime(), dayOpsStart.getTime());
      const overlapEnd = Math.min(periodEnd.getTime(), dayOpsEnd.getTime());
      const overlapHours = Math.max(
        0,
        (overlapEnd - overlapStart) / (1000 * 60 * 60)
      );

      if (overlapHours > 0) {
        if (status === "idle") idleOps += overlapHours;
        else if (status === "on_duty") onOps += overlapHours;
        else if (status === "off") offOps += overlapHours;
        else if (status === "disconnect") disconnectOps += overlapHours;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { onOps, offOps, idleOps, disconnectOps };
  }

  function addDuration(status: MachineStatus, start: Date, end: Date) {
    const clampedStart = start < startDate ? startDate : start;
    const clampedEnd = end > effectiveEndDate ? effectiveEndDate : end;

    const hours = Math.max(
      0,
      (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60)
    );
    if (hours <= 0) return;

    const ops = calculateOperationalHours(clampedStart, clampedEnd, status);

    if (status === "idle") {
      idleHours += hours;
      operationalIdleHours += ops.idleOps;
    } else if (status === "on_duty") {
      onDutyHours += hours;
      operationalOnHours += ops.onOps;
    } else if (status === "off") {
      offHours += hours;
      operationalOffHours += ops.offOps;
    } else if (status === "disconnect") {
      disconnectHours += hours;
      operationalDisconnectHours += ops.disconnectOps;
    }
  }

  const timeline = [
    ...(previousLog ? [previousLog] : []),
    ...logsInRange,
    ...(nextLogAfterRange ? [nextLogAfterRange] : []),
  ];

  if (timeline.length === 0) {
    const totalDays =
      Math.ceil(
        (effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) || 1;

    const totalOpsTime = opsHoursPerDay * totalDays;

    return {
      idle_hours: "0.00",
      onduty_hours: "0.00",
      on_total_hours: "0.00",
      off_hours: "0.00",
      disconnect_hours: "0.00",

      operational_on_hours: "0.00",
      operational_off_hours: "0.00",
      operational_idle_hours: "0.00",
      operational_disconnect_hours: "0.00",
      total_operational_hours: totalOpsTime.toFixed(2),

      availability_percent: "0.00",
    };
  }

  for (let i = 0; i < timeline.length; i++) {
    const currentLog = timeline[i];
    const nextLog = timeline[i + 1];

    const status = currentLog.status as MachineStatus;
    const logStart = currentLog.timestamp;

    if (nextLog) {
      const nextTs = nextLog.timestamp;
      const cutoff = new Date(logStart.getTime() + DISCONNECT_TIMEOUT_MS);

      if (nextTs <= cutoff) {
        addDuration(status, logStart, nextTs);
      } else {
        addDuration(status, logStart, cutoff);
        addDuration("disconnect", cutoff, nextTs);
      }
    } else {
      const cutoff = new Date(logStart.getTime() + DISCONNECT_TIMEOUT_MS);
      const validUntil = cutoff < effectiveEndDate ? cutoff : effectiveEndDate;

      addDuration(status, logStart, validUntil);

      if (effectiveEndDate > cutoff) {
        addDuration("disconnect", cutoff, effectiveEndDate);
      }
    }
  }

  const onHours = idleHours + onDutyHours;
  const operationalOnTime = operationalOnHours + operationalIdleHours;

  const totalDays =
    Math.ceil(
      (effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) || 1;

  const totalOpsTime = opsHoursPerDay * totalDays;

  let availability = 0;
  if (totalOpsTime > 0) {
    availability = (operationalOnTime / totalOpsTime) * 100;
  }

  return {
    idle_hours: idleHours.toFixed(2),
    onduty_hours: onDutyHours.toFixed(2),
    on_total_hours: onHours.toFixed(2),
    off_hours: offHours.toFixed(2),
    disconnect_hours: disconnectHours.toFixed(2),

    operational_on_hours: operationalOnTime.toFixed(2),
    operational_off_hours: operationalOffHours.toFixed(2),
    operational_idle_hours: operationalIdleHours.toFixed(2),
    operational_disconnect_hours: operationalDisconnectHours.toFixed(2),
    total_operational_hours: totalOpsTime.toFixed(2),

    availability_percent: Math.max(0, Math.min(100, availability)).toFixed(2),
  };
}