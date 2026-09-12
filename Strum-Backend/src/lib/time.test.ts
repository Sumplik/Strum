import { describe, expect, it } from "bun:test";
import { dayBounds, formatLocal, fromWallClock, parseHhmm, parseYmd, startOfDay, wallClock } from "./time";

const TZ = "Asia/Jakarta";

describe("time helpers (Asia/Jakarta, UTC+7)", () => {
  it("round-trips wall clock conversions", () => {
    const instant = fromWallClock({ year: 2026, month: 9, day: 12, hour: 8, minute: 30 }, TZ);
    expect(instant.toISOString()).toBe("2026-09-12T01:30:00.000Z");
    expect(wallClock(instant, TZ)).toEqual({ year: 2026, month: 9, day: 12, hour: 8, minute: 30, second: 0 });
  });

  it("handles a DST zone as well", () => {
    const instant = fromWallClock({ year: 2026, month: 7, day: 1, hour: 12 }, "Europe/Berlin");
    expect(instant.toISOString()).toBe("2026-07-01T10:00:00.000Z");
  });

  it("computes day bounds in the zone", () => {
    const bounds = dayBounds("2026-09-12", TZ)!;
    expect(bounds.start.toISOString()).toBe("2026-09-11T17:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-12T16:59:59.999Z");
    expect(dayBounds("2026-02-30", TZ)).toBeNull();
    expect(dayBounds("12-09-2026", TZ)).toBeNull();
  });

  it("finds the start of the local day", () => {
    expect(startOfDay(new Date("2026-09-12T16:59:00.000Z"), TZ).toISOString()).toBe("2026-09-11T17:00:00.000Z");
    expect(startOfDay(new Date("2026-09-12T17:00:00.000Z"), TZ).toISOString()).toBe("2026-09-12T17:00:00.000Z");
  });

  it("parses and formats", () => {
    expect(parseYmd("2026-09-12")).toEqual({ year: 2026, month: 9, day: 12 });
    expect(parseHhmm("07:30")).toEqual({ hour: 7, minute: 30 });
    expect(parseHhmm("24:00")).toBeNull();
    expect(formatLocal(new Date("2026-09-12T01:05:09.000Z"), TZ)).toBe("2026-09-12 08:05:09");
  });
});
