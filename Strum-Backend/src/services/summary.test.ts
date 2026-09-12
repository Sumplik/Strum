import { describe, expect, it } from "bun:test";
import { fromWallClock } from "../lib/time";
import { buildOperationalWindows, computeSummary, overlapHours } from "./summary";

const TZ = "Asia/Jakarta";
const opsHours = { start: "08:00", end: "17:00" };
const at = (hour: number, minute = 0, day = 5) => fromWallClock({ year: 2026, month: 1, day, hour, minute }, TZ);

const summarize = (logs: { timestamp: Date; status: "off" | "idle" | "on_duty" }[], startDate: Date, endDate: Date) =>
  computeSummary({ logs, startDate, endDate, opsHours, timeZone: TZ });

describe("operational windows", () => {
  it("builds one window per local day and measures overlap", () => {
    const windows = buildOperationalWindows(at(0), at(0, 0, 7), opsHours, TZ);
    expect(windows).toHaveLength(3);
    expect(new Date(windows[0].start).toISOString()).toBe("2026-01-05T01:00:00.000Z");
    expect(overlapHours(at(0), at(0, 0, 7), windows)).toBe(18);
    expect(overlapHours(at(7), at(9), windows)).toBe(1);
    expect(overlapHours(at(18), at(20), windows)).toBe(0);
  });

  it("respects minutes in the operational hours", () => {
    const windows = buildOperationalWindows(at(0), at(23, 59), { start: "07:30", end: "16:15" }, TZ);
    expect(overlapHours(at(0), at(23, 59), windows)).toBeCloseTo(8.75, 5);
  });
});

describe("computeSummary", () => {
  it("returns zeros but still reports the operational window when there are no logs", () => {
    expect(summarize([], at(0), at(0, 0, 7))).toEqual({
      idleHours: 0,
      onDutyHours: 0,
      onTotalHours: 0,
      offHours: 0,
      disconnectHours: 0,
      operationalOnHours: 0,
      operationalIdleHours: 0,
      operationalOffHours: 0,
      operationalDisconnectHours: 0,
      totalOperationalHours: 18,
      availabilityPercent: 0,
    });
  });

  it("counts each status until the next log while the device keeps reporting", () => {
    const result = summarize(
      [
        { timestamp: at(8, 0), status: "on_duty" },
        { timestamp: at(8, 3), status: "idle" },
        { timestamp: at(8, 6), status: "off" },
      ],
      at(0),
      at(8, 6),
    );

    expect(result.onDutyHours).toBe(0.05);
    expect(result.idleHours).toBe(0.05);
    expect(result.onTotalHours).toBe(0.1);
    expect(result.offHours).toBe(0);
    expect(result.disconnectHours).toBe(0);
    expect(result.operationalOnHours).toBe(0.1);
    expect(result.totalOperationalHours).toBe(0.1);
    expect(result.availabilityPercent).toBe(100);
  });

  it("treats silence longer than the disconnect timeout as disconnected time", () => {
    const result = summarize([{ timestamp: at(8, 0), status: "on_duty" }], at(0), at(12));

    expect(result.onDutyHours).toBe(0.1);
    expect(result.disconnectHours).toBe(3.9);
    expect(result.operationalDisconnectHours).toBe(3.9);
    expect(result.totalOperationalHours).toBe(4);
    expect(result.availabilityPercent).toBe(2.5);
  });

  it("splits a gap between two logs into reported time plus disconnected time", () => {
    const result = summarize(
      [
        { timestamp: at(9, 0), status: "off" },
        { timestamp: at(10, 0), status: "on_duty" },
      ],
      at(0),
      at(10),
    );

    expect(result.offHours).toBe(0.1);
    expect(result.disconnectHours).toBe(0.9);
    expect(result.operationalOffHours).toBe(0.1);
    expect(result.operationalDisconnectHours).toBe(0.9);
  });

  it("excludes time outside operational hours from availability", () => {
    const result = summarize(
      [
        { timestamp: at(6, 0), status: "on_duty" },
        { timestamp: at(6, 3), status: "on_duty" },
      ],
      at(0),
      at(6, 3),
    );

    expect(result.onDutyHours).toBe(0.05);
    expect(result.operationalOnHours).toBe(0);
    expect(result.totalOperationalHours).toBe(0);
    expect(result.availabilityPercent).toBe(0);
  });

  it("clamps logs from before the range to the range start", () => {
    const result = summarize(
      [
        { timestamp: at(7, 58), status: "on_duty" },
        { timestamp: at(8, 1), status: "on_duty" },
      ],
      at(8),
      at(8, 1),
    );

    expect(result.onDutyHours).toBe(0.02);
    expect(result.operationalOnHours).toBe(0.02);
    expect(result.availabilityPercent).toBe(100);
  });

  it("gives full availability for a full day of on_duty heartbeats", () => {
    const logs = [];
    for (let minute = 0; minute <= 24 * 60; minute += 3) {
      logs.push({ timestamp: new Date(at(0).getTime() + minute * 60_000), status: "on_duty" as const });
    }
    const result = summarize(logs, at(0), at(23, 59, 5));
    expect(result.totalOperationalHours).toBe(9);
    expect(result.operationalOnHours).toBe(9);
    expect(result.availabilityPercent).toBe(100);
  });
});
