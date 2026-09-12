-- Multi-branch upgrade (data preserving).
--
-- Devices are now scoped to a branch (Branch.id, e.g. UP2W1) and identified by
-- (branchId, code); logs are normalised into columns instead of a raw JSON blob.
-- Rows from the single-office era are assigned to the branch named in the
-- temporary table below (the same branch that keeps receiving the old
-- mesin/telemetry/<deviceId> topics, see LEGACY_BRANCH_ID). Change that value
-- BEFORE applying if the original office is a different branch.

CREATE TEMP TABLE "_migration_settings" ("legacyBranchId" TEXT NOT NULL);
INSERT INTO "_migration_settings" VALUES ('UP2W6');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Enum + Branch
-- ---------------------------------------------------------------------------
CREATE TYPE "MachineStatus" AS ENUM ('off', 'idle', 'on_duty');

CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opsStart" TEXT NOT NULL DEFAULT '08:00',
    "opsEnd" TEXT NOT NULL DEFAULT '17:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Branch" ("id", "name", "updatedAt") VALUES
    ('UP2W1', 'UP2W1', CURRENT_TIMESTAMP),
    ('UP2W2', 'UP2W2', CURRENT_TIMESTAMP),
    ('UP2W3', 'UP2W3', CURRENT_TIMESTAMP),
    ('UP2W4', 'UP2W4', CURRENT_TIMESTAMP),
    ('UP2W5', 'UP2W5', CURRENT_TIMESTAMP),
    ('UP2W6', 'UP2W6', CURRENT_TIMESTAMP);

-- The old global operational hours become the starting value for every branch.
UPDATE "Branch" b
SET "opsStart" = COALESCE(NULLIF(c."value" ->> 'start', ''), b."opsStart"),
    "opsEnd"   = COALESCE(NULLIF(c."value" ->> 'end', ''), b."opsEnd")
FROM "AppConfig" c
WHERE c."key" = 'operational_hours';

DROP TABLE "AppConfig";

-- ---------------------------------------------------------------------------
-- Device: surrogate key, branch, normalised columns
-- ---------------------------------------------------------------------------
ALTER TABLE "DeviceLog" DROP CONSTRAINT "DeviceLog_deviceId_fkey";

ALTER TABLE "Device"
    ADD COLUMN "uid" TEXT,
    ADD COLUMN "branchId" TEXT,
    ADD COLUMN "code" TEXT,
    ADD COLUMN "reportedStatus" TEXT,
    ADD COLUMN "firmwareVersion" TEXT,
    ADD COLUMN "threshold" DOUBLE PRECISION;

UPDATE "Device" d
SET "uid"             = gen_random_uuid()::text,
    "branchId"        = s."legacyBranchId",
    "code"            = UPPER(TRIM(d."id")),
    "threshold"       = d."thresholdDuty",
    "firmwareVersion" = NULLIF(d."rawData" ->> 'version', ''),
    "reportedStatus"  = LOWER(NULLIF(d."rawData" -> 'data' ->> 'status_mesin', ''))
FROM "_migration_settings" s;

-- Codes are case-insensitive now; suffix any collisions inside a branch.
WITH ranked AS (
    SELECT "uid", ROW_NUMBER() OVER (PARTITION BY "branchId", "code" ORDER BY "createdAt", "id") AS rn
    FROM "Device"
)
UPDATE "Device" d
SET "code" = d."code" || '-' || ranked.rn
FROM ranked
WHERE d."uid" = ranked."uid" AND ranked.rn > 1;

UPDATE "Device" SET "status" = 'off' WHERE "status" NOT IN ('off', 'idle', 'on_duty');
ALTER TABLE "Device" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Device" ALTER COLUMN "status" TYPE "MachineStatus" USING ("status"::"MachineStatus");
ALTER TABLE "Device" ALTER COLUMN "status" SET DEFAULT 'off';

-- ---------------------------------------------------------------------------
-- DeviceLog: repoint to the surrogate key, denormalise branch, flatten rawData
-- ---------------------------------------------------------------------------
ALTER TABLE "DeviceLog"
    ADD COLUMN "deviceUid" TEXT,
    ADD COLUMN "branchId" TEXT,
    ADD COLUMN "reportedStatus" TEXT,
    ADD COLUMN "threshold" DOUBLE PRECISION,
    ADD COLUMN "arus" DOUBLE PRECISION,
    ADD COLUMN "voltase" DOUBLE PRECISION,
    ADD COLUMN "suhu" DOUBLE PRECISION,
    ADD COLUMN "kelembapan" DOUBLE PRECISION,
    ADD COLUMN "ipAddress" TEXT;

UPDATE "DeviceLog" l
SET "deviceUid" = d."uid",
    "branchId"  = d."branchId"
FROM "Device" d
WHERE l."deviceId" = d."id";

DELETE FROM "DeviceLog" WHERE "deviceUid" IS NULL;

UPDATE "DeviceLog"
SET "arus"           = CASE WHEN jsonb_typeof("rawData" -> 'data' -> 'arus') = 'number'       THEN ("rawData" -> 'data' ->> 'arus')::DOUBLE PRECISION END,
    "voltase"        = CASE WHEN jsonb_typeof("rawData" -> 'data' -> 'voltase') = 'number'    THEN ("rawData" -> 'data' ->> 'voltase')::DOUBLE PRECISION END,
    "suhu"           = CASE WHEN jsonb_typeof("rawData" -> 'data' -> 'suhu') = 'number'       THEN ("rawData" -> 'data' ->> 'suhu')::DOUBLE PRECISION END,
    "kelembapan"     = CASE WHEN jsonb_typeof("rawData" -> 'data' -> 'kelembapan') = 'number' THEN ("rawData" -> 'data' ->> 'kelembapan')::DOUBLE PRECISION END,
    "threshold"      = CASE WHEN jsonb_typeof("rawData" -> 'threshold') = 'number'            THEN ("rawData" ->> 'threshold')::DOUBLE PRECISION END,
    "reportedStatus" = LOWER(NULLIF("rawData" -> 'data' ->> 'status_mesin', '')),
    "ipAddress"      = NULLIF("rawData" -> 'connection' ->> 'ipaddress', '');

UPDATE "DeviceLog" SET "status" = 'off' WHERE "status" NOT IN ('off', 'idle', 'on_duty');
ALTER TABLE "DeviceLog" ALTER COLUMN "status" TYPE "MachineStatus" USING ("status"::"MachineStatus");

-- (device, timestamp) becomes unique; keep the earliest inserted duplicate.
DELETE FROM "DeviceLog" a
USING "DeviceLog" b
WHERE a."deviceUid" = b."deviceUid"
  AND a."timestamp" = b."timestamp"
  AND (a."createdAt" > b."createdAt" OR (a."createdAt" = b."createdAt" AND a.ctid > b.ctid));

DROP INDEX IF EXISTS "DeviceLog_deviceId_timestamp_idx";
DROP INDEX IF EXISTS "DeviceLog_timestamp_idx";

ALTER TABLE "DeviceLog" DROP COLUMN "deviceId";
ALTER TABLE "DeviceLog" DROP COLUMN "rawData";
ALTER TABLE "DeviceLog" RENAME COLUMN "deviceUid" TO "deviceId";
ALTER TABLE "DeviceLog"
    ALTER COLUMN "deviceId" SET NOT NULL,
    ALTER COLUMN "branchId" SET NOT NULL;

ALTER TABLE "Device" DROP CONSTRAINT "Device_pkey";
ALTER TABLE "Device"
    DROP COLUMN "id",
    DROP COLUMN "rawData",
    DROP COLUMN "thresholdIdle",
    DROP COLUMN "thresholdDuty";
ALTER TABLE "Device" RENAME COLUMN "uid" TO "id";
ALTER TABLE "Device"
    ALTER COLUMN "id" SET NOT NULL,
    ALTER COLUMN "branchId" SET NOT NULL,
    ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Device" ADD CONSTRAINT "Device_pkey" PRIMARY KEY ("id");

-- ---------------------------------------------------------------------------
-- Indexes and foreign keys
-- ---------------------------------------------------------------------------
CREATE INDEX "Device_branchId_status_idx" ON "Device"("branchId", "status");
CREATE INDEX "Device_branchId_lastSeen_idx" ON "Device"("branchId", "lastSeen");
CREATE UNIQUE INDEX "Device_branchId_code_key" ON "Device"("branchId", "code");
CREATE INDEX "DeviceLog_branchId_timestamp_idx" ON "DeviceLog"("branchId", "timestamp");
CREATE UNIQUE INDEX "DeviceLog_deviceId_timestamp_key" ON "DeviceLog"("deviceId", "timestamp");

ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceLog" ADD CONSTRAINT "DeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceLog" ADD CONSTRAINT "DeviceLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- User timestamps
-- ---------------------------------------------------------------------------
ALTER TABLE "User"
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

DROP TABLE "_migration_settings";
