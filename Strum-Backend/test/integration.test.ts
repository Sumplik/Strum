// End-to-end tests against a real PostgreSQL. Run with TEST_DATABASE_URL pointing at a throwaway
// database that already has the migrations applied (see README); skipped otherwise.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { unzipSync, strFromU8 } from "fflate";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.TIMEZONE = "Asia/Jakarta";
  process.env.COOKIE_SECURE = "false";
}

describe.skipIf(!TEST_DATABASE_URL)("integration", () => {
  let prisma: (typeof import("../src/db"))["prisma"];
  let app: ReturnType<(typeof import("../src/app"))["createApp"]>;
  let ingestMessage: (typeof import("../src/services/ingestion"))["ingestMessage"];
  let cookie = "";

  const BRANCHES = ["UP2W1", "UP2W2", "UP2W3", "UP2W4", "UP2W5", "UP2W6"];
  const wib = (iso: string) => new Date(`${iso}+07:00`);

  const request = (path: string, init: RequestInit = {}, auth = true) =>
    app.handle(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(auth && cookie ? { cookie } : {}),
          ...(init.headers ?? {}),
        },
      }),
    );

  const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as any });

  const telemetry = (overrides: Record<string, unknown> = {}, data: Record<string, unknown> = {}) =>
    JSON.stringify({
      device_id: "6CNC1",
      location: "Ruang CNC",
      version: "1.0",
      threshold: 22,
      data: { arus: 25.4, suhu: 38.2, voltase: 220.1, kelembapan: 70.5, status_mesin: "ON", ...data },
      ...overrides,
    });

  beforeAll(async () => {
    ({ prisma } = await import("../src/db"));
    ({ ingestMessage } = await import("../src/services/ingestion"));
    const { createApp } = await import("../src/app");
    const { refreshBranchCache } = await import("../src/services/branches");

    await prisma.deviceLog.deleteMany();
    await prisma.device.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.createMany({ data: BRANCHES.map((id) => ({ id, name: id })) });
    await prisma.user.create({ data: { username: "admin", password: await Bun.password.hash("admin123") } });
    await refreshBranchCache();

    app = createApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("health & auth", () => {
    it("reports health without authentication", async () => {
      const { status, body } = await json(await request("/api/health", {}, false));
      expect(status).toBe(200);
      expect(body.data.database).toBe("ok");
      expect(body.data.timezone).toBe("Asia/Jakarta");
    });

    it("rejects protected routes without a session", async () => {
      const { status, body } = await json(await request("/api/branches", {}, false));
      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("rejects wrong credentials and validates the body", async () => {
      expect((await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin", password: "nope" }) })).status).toBe(401);
      const bad = await json(await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin" }) }));
      expect(bad.status).toBe(400);
      expect(bad.body.message).toBe("Validasi gagal");
    });

    it("logs in and sets the session cookie", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "admin123" }),
      });
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain("auth_session=");
      expect(setCookie).toContain("HttpOnly");
      cookie = setCookie.split(";")[0];

      const me = await json(await request("/api/auth/me"));
      expect(me.body.data.username).toBe("admin");
    });

    it("rate limits repeated failed logins", async () => {
      let last = 0;
      for (let i = 0; i < 11; i++) {
        last = (await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "bruteforce", password: "x" }) })).status;
      }
      expect(last).toBe(429);
    });

    it("changes the password and accepts the new one", async () => {
      const wrong = await request("/api/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword: "nope", newPassword: "newpassword1" }) });
      expect(wrong.status).toBe(401);

      const ok = await request("/api/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword: "admin123", newPassword: "newpassword1" }) });
      expect(ok.status).toBe(200);

      const login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin", password: "newpassword1" }) });
      expect(login.status).toBe(200);
    });
  });

  describe("ingestion", () => {
    it("stores a telemetry message, normalising branch and device code", async () => {
      const outcome = await ingestMessage("mesin/telemetry/up2w1", telemetry(), wib("2026-01-05T08:00:00"));
      expect(outcome.status).toBe("stored");

      const device = await prisma.device.findUnique({ where: { branchId_code: { branchId: "UP2W1", code: "6CNC1" } } });
      expect(device).toMatchObject({
        status: "on_duty",
        reportedStatus: "on",
        threshold: 22,
        arus: 25.4,
        location: "Ruang CNC",
        firmwareVersion: "1.0",
      });
      expect(device!.lastSeen.toISOString()).toBe("2026-01-05T01:00:00.000Z");
    });

    it("ignores an exact duplicate and keeps out-of-order messages from rolling state back", async () => {
      expect((await ingestMessage("mesin/telemetry/UP2W1", telemetry(), wib("2026-01-05T08:00:00"))).status).toBe("duplicate");

      const older = await ingestMessage("mesin/telemetry/UP2W1", telemetry({}, { arus: 1 }), wib("2026-01-05T07:57:00"));
      expect(older.status).toBe("stored");

      const device = await prisma.device.findUnique({ where: { branchId_code: { branchId: "UP2W1", code: "6CNC1" } } });
      expect(device!.status).toBe("on_duty");
      expect(device!.arus).toBe(25.4);
      expect(await prisma.deviceLog.count({ where: { deviceId: device!.id } })).toBe(2);
    });

    it("falls back to the stored threshold and derives idle / off", async () => {
      const idle = await ingestMessage("mesin/telemetry/UP2W1", telemetry({ threshold: undefined }, { arus: 5 }), wib("2026-01-05T08:03:00"));
      expect(idle.status).toBe("stored");
      let device = await prisma.device.findUnique({ where: { branchId_code: { branchId: "UP2W1", code: "6CNC1" } } });
      expect(device).toMatchObject({ status: "idle", threshold: 22, arus: 5 });

      await ingestMessage("mesin/telemetry/UP2W1", telemetry({}, { status_mesin: "OFF" }), wib("2026-01-05T08:06:00"));
      device = await prisma.device.findUnique({ where: { branchId_code: { branchId: "UP2W1", code: "6CNC1" } } });
      expect(device!.status).toBe("off");
    });

    it("keeps the same device code separate per branch", async () => {
      expect((await ingestMessage("mesin/telemetry/UP2W2", telemetry(), wib("2026-01-05T08:00:00"))).status).toBe("stored");
      expect(await prisma.device.count({ where: { code: "6CNC1" } })).toBe(2);
    });

    it("rejects unknown branch-shaped topics, malformed JSON and payloads without device_id", async () => {
      expect(await ingestMessage("mesin/telemetry/UP2W9", telemetry())).toMatchObject({ status: "rejected", reason: "branch_unknown" });
      expect(await ingestMessage("mesin/telemetry/UP2W1", "{not json")).toMatchObject({ status: "rejected", reason: "json_invalid" });
      expect(await ingestMessage("mesin/telemetry/UP2W1", JSON.stringify({ data: {} }))).toMatchObject({ status: "rejected", reason: "device_id_invalid" });
      expect(await ingestMessage("other/topic", telemetry())).toMatchObject({ status: "rejected", reason: "topic_invalid" });
    });

    it("stores legacy topics (device id or bare root) under the legacy branch UP2W6", async () => {
      const byDeviceTopic = await ingestMessage("mesin/telemetry/6CNC1", telemetry(), wib("2026-01-05T09:00:00"));
      expect(byDeviceTopic).toMatchObject({ status: "stored", branchId: "UP2W6", code: "6CNC1" });

      const bare = await ingestMessage("mesin/telemetry", telemetry({ device_id: "MESIN-OLD" }), wib("2026-01-05T09:00:00"));
      expect(bare).toMatchObject({ status: "stored", branchId: "UP2W6", code: "MESIN-OLD" });

      const fromTopic = await ingestMessage("mesin/telemetry/legacy-7", JSON.stringify({ data: { arus: 30, status_mesin: "ON" } }), wib("2026-01-05T09:00:00"));
      expect(fromTopic).toMatchObject({ status: "stored", branchId: "UP2W6", code: "LEGACY-7" });

      const codes = await prisma.device.findMany({ where: { branchId: "UP2W6" }, select: { code: true }, orderBy: { code: "asc" } });
      expect(codes.map((d) => d.code)).toEqual(["6CNC1", "LEGACY-7", "MESIN-OLD"]);
    });

    it("accepts branch ids with stray spaces in the topic", async () => {
      const outcome = await ingestMessage("mesin/telemetry/up2w 5", telemetry({ device_id: "SPACED" }), wib("2026-01-05T09:00:00"));
      expect(outcome).toMatchObject({ status: "stored", branchId: "UP2W5", code: "SPACED" });
    });
  });

  describe("branch & device API", () => {
    it("lists branches with device counts", async () => {
      const { status, body } = await json(await request("/api/branches"));
      expect(status).toBe(200);
      expect(body.data.map((b: any) => b.id)).toEqual(BRANCHES);
      expect(body.data[0].deviceCount).toBe(1);
      expect(body.data[0].operationalHours).toEqual({ start: "08:00", end: "17:00" });
    });

    it("returns branch detail with stats and a 404 for unknown branches", async () => {
      const { body } = await json(await request("/api/branches/up2w1"));
      expect(body.data.id).toBe("UP2W1");
      expect(body.data.stats).toMatchObject({ total: 1, off: 1, online: 0, disconnect: 1 });

      const missing = await json(await request("/api/branches/UP2W9"));
      expect(missing.status).toBe(404);
    });

    it("lists devices with online flags and finds a device case-insensitively", async () => {
      const now = new Date();
      await ingestMessage("mesin/telemetry/UP2W3", telemetry({ device_id: "live-1" }), now);

      const list = await json(await request("/api/branches/UP2W3/devices"));
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({ code: "LIVE-1", online: true, effectiveStatus: "on_duty", branchId: "UP2W3" });

      const stale = await json(await request("/api/branches/UP2W1/devices"));
      expect(stale.body.data[0]).toMatchObject({ code: "6CNC1", online: false, effectiveStatus: "disconnect" });

      const detail = await json(await request("/api/branches/up2w3/devices/live-1"));
      expect(detail.status).toBe(200);
      expect(detail.body.data.code).toBe("LIVE-1");

      expect((await request("/api/branches/UP2W3/devices/nope")).status).toBe(404);
      const filtered = await json(await request("/api/branches/UP2W3/devices?status=off"));
      expect(filtered.body.data).toHaveLength(0);
    });

    it("pages device logs newest first", async () => {
      const { body } = await json(await request("/api/branches/UP2W1/devices/6CNC1/logs?limit=2"));
      expect(body.data).toHaveLength(2);
      expect(new Date(body.data[0].timestamp) > new Date(body.data[1].timestamp)).toBe(true);
      expect(body.meta.nextBefore).toBeTruthy();

      const next = await json(await request(`/api/branches/UP2W1/devices/6CNC1/logs?limit=2&before=${encodeURIComponent(body.meta.nextBefore)}`));
      expect(next.body.data).toHaveLength(2);
      expect(next.body.meta.nextBefore).toBeNull();
    });

    it("computes the branch summary for a calendar day in WIB", async () => {
      const { status, body } = await json(await request("/api/branches/UP2W1/summary?start=2026-01-05&end=2026-01-05"));
      expect(status).toBe(200);
      expect(body.data.range.start).toBe("2026-01-04T17:00:00.000Z");
      expect(body.data.devices).toHaveLength(1);
      const summary = body.data.devices[0].summary;
      // 07:57 idle (arus 1) → 08:00 on_duty → 08:03 idle → 08:06 off → silence until midnight
      expect(summary.onDutyHours).toBe(0.05);
      expect(summary.idleHours).toBe(0.1);
      expect(summary.offHours).toBe(0.1);
      expect(summary.disconnectHours).toBeCloseTo(15.8, 2);
      expect(summary.operationalOnHours).toBe(0.1);
      expect(summary.totalOperationalHours).toBe(9);
      expect(summary.availabilityPercent).toBe(1.11);
      expect(body.data.averageAvailabilityPercent).toBe(1.11);

      const single = await json(await request("/api/branches/UP2W1/devices/6CNC1/summary?start=2026-01-05&end=2026-01-05"));
      expect(single.body.data.device.summary).toEqual(summary);
    });

    it("validates date ranges", async () => {
      expect((await request("/api/branches/UP2W1/summary?start=2026-01-10&end=2026-01-05")).status).toBe(400);
      expect((await request("/api/branches/UP2W1/summary?start=2026-01-01&end=2026-12-31")).status).toBe(400);
      expect((await request("/api/branches/UP2W1/summary?start=2026-02-30&end=2026-02-30")).status).toBe(400);
    });

    it("exposes an overview across branches", async () => {
      const { body } = await json(await request("/api/overview"));
      expect(body.data.branches).toHaveLength(6);
      expect(body.data.totals.total).toBe(7);
    });

    it("lists devices across all branches, ordered by branch then code", async () => {
      const { status, body } = await json(await request("/api/devices"));
      expect(status).toBe(200);
      expect(body.data.map((d: any) => `${d.branchId}/${d.code}`)).toEqual([
        "UP2W1/6CNC1",
        "UP2W2/6CNC1",
        "UP2W3/LIVE-1",
        "UP2W5/SPACED",
        "UP2W6/6CNC1",
        "UP2W6/LEGACY-7",
        "UP2W6/MESIN-OLD",
      ]);

      const searched = await json(await request("/api/devices?search=legacy"));
      expect(searched.body.data.map((d: any) => d.code)).toEqual(["LEGACY-7"]);

      const online = await json(await request("/api/devices?status=on_duty"));
      expect(online.body.data.map((d: any) => d.code)).toEqual(["LIVE-1"]);
    });

    it("summarises every branch at once with per-branch operational hours", async () => {
      const { status, body } = await json(await request("/api/summary?start=2026-01-05&end=2026-01-05"));
      expect(status).toBe(200);
      expect(body.data.branches.map((b: any) => b.branchId)).toEqual(BRANCHES);
      expect(body.data.devices).toHaveLength(7);

      const up2w1 = body.data.devices.find((row: any) => row.device.branchId === "UP2W1" && row.device.code === "6CNC1");
      expect(up2w1.summary.availabilityPercent).toBe(1.11);
      // Enam mesin punya satu log ON pada hari itu (0.1 jam dari 9 jam operasional = 1.11%);
      // hanya LIVE-1 (UP2W3) yang lognya di luar rentang → rata-rata 6 × 1.11 / 7.
      expect(body.data.averageAvailabilityPercent).toBe(0.95);

      expect((await request("/api/summary?start=2026-01-01&end=2026-12-31")).status).toBe(400);
    });
  });

  describe("exports", () => {
    it("exports branch logs as CSV with Excel-friendly encoding", async () => {
      const res = await request("/api/branches/UP2W1/exports/logs?format=csv&start=2026-01-05&end=2026-01-05");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(res.headers.get("content-disposition")).toContain("strum-logs-UP2W1-2026-01-05_2026-01-05.csv");

      const bytes = new Uint8Array(await res.arrayBuffer());
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const lines = new TextDecoder().decode(bytes).split("\r\n").filter(Boolean);
      expect(lines[0]).toBe("Waktu,Cabang,ID Mesin,Lokasi,Status,Status Dilaporkan,Arus (A),Voltase (V),Suhu (°C),Kelembapan (%),Threshold (A),IP Address");
      expect(lines).toHaveLength(5);
      expect(lines[1]).toBe("2026-01-05 07:57:00,UP2W1,6CNC1,Ruang CNC,Idle,on,1,220.1,38.2,70.5,22,");
    });

    it("supports semicolon delimiters and per-device scope", async () => {
      const res = await request("/api/branches/UP2W1/devices/6cnc1/exports/logs?format=csv&delimiter=semicolon&start=2026-01-05&end=2026-01-05");
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.split("\r\n")[1]).toContain("2026-01-05 07:57:00;UP2W1;6CNC1");
    });

    it("exports logs and summary as Excel workbooks", async () => {
      const logs = await request("/api/branches/UP2W1/devices/6CNC1/exports/logs?format=xlsx&start=2026-01-05&end=2026-01-05");
      expect(logs.status).toBe(200);
      expect(logs.headers.get("content-type")).toContain("spreadsheetml");
      const files = unzipSync(new Uint8Array(await logs.arrayBuffer()));
      const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
      expect(sheet).toContain("6CNC1");
      expect(sheet).toContain("<v>25.4</v>");

      const summary = await request("/api/branches/UP2W1/exports/summary?format=xlsx&start=2026-01-05&end=2026-01-05");
      expect(summary.status).toBe(200);
      const summarySheet = strFromU8(unzipSync(new Uint8Array(await summary.arrayBuffer()))["xl/worksheets/sheet1.xml"]);
      expect(summarySheet).toContain("Availability (%)");
      expect(summarySheet).toContain("<v>1.11</v>");
    });

    it("exports logs and summary across all branches", async () => {
      const logs = await request("/api/exports/logs?format=csv&start=2026-01-05&end=2026-01-05");
      expect(logs.status).toBe(200);
      expect(logs.headers.get("content-disposition")).toContain("strum-logs-SEMUA-CABANG-2026-01-05_2026-01-05.csv");
      const lines = (await logs.text()).split("\r\n").filter(Boolean);
      // UP2W1: 4 log, UP2W2: 1, UP2W5: 1, UP2W6: 3 (+ header)
      expect(lines).toHaveLength(10);
      expect(new Set(lines.slice(1).map((line) => line.split(",")[1]))).toEqual(new Set(["UP2W1", "UP2W2", "UP2W5", "UP2W6"]));

      const summary = await request("/api/exports/summary?format=xlsx&start=2026-01-05&end=2026-01-05");
      expect(summary.status).toBe(200);
      const sheet = strFromU8(unzipSync(new Uint8Array(await summary.arrayBuffer()))["xl/worksheets/sheet1.xml"]);
      expect(sheet).toContain("UP2W6");
      expect(sheet).toContain("LEGACY-7");
    });

    it("rejects unsupported formats", async () => {
      expect((await request("/api/branches/UP2W1/exports/logs?format=json&start=2026-01-05&end=2026-01-05")).status).toBe(400);
    });
  });

  describe("branch management", () => {
    it("creates, updates and refuses to delete a branch that still has devices", async () => {
      const created = await json(await request("/api/branches", { method: "POST", body: JSON.stringify({ id: "up2w7", name: "Cabang 7" }) }));
      expect(created.status).toBe(201);
      expect(created.body.data.id).toBe("UP2W7");

      expect((await request("/api/branches", { method: "POST", body: JSON.stringify({ id: "UP2W7" }) })).status).toBe(409);

      const badHours = await request("/api/branches/UP2W7", { method: "PATCH", body: JSON.stringify({ operationalHours: { start: "17:00", end: "08:00" } }) });
      expect(badHours.status).toBe(400);

      const updated = await json(await request("/api/branches/UP2W7", { method: "PATCH", body: JSON.stringify({ operationalHours: { start: "07:30", end: "16:00" } }) }));
      expect(updated.body.data.operationalHours).toEqual({ start: "07:30", end: "16:00" });

      expect((await ingestMessage("mesin/telemetry/UP2W7", telemetry())).status).toBe("stored");
      expect((await request("/api/branches/UP2W7", { method: "DELETE" })).status).toBe(409);

      const removedDevice = await json(await request("/api/branches/UP2W7/devices/6CNC1", { method: "DELETE" }));
      expect(removedDevice.status).toBe(200);
      expect((await request("/api/branches/UP2W7", { method: "DELETE" })).status).toBe(200);
      expect((await ingestMessage("mesin/telemetry/UP2W7", telemetry())).status).toBe("rejected");
    });

    it("returns JSON 404 for unknown endpoints", async () => {
      const { status, body } = await json(await request("/api/nope"));
      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
});
