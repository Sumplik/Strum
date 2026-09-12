/*
  Warnings:

  - You are about to drop the column `arus` on the `DeviceLog` table. All the data in the column will be lost.
  - You are about to drop the column `kelembapan` on the `DeviceLog` table. All the data in the column will be lost.
  - You are about to drop the column `suhu` on the `DeviceLog` table. All the data in the column will be lost.
  - You are about to drop the column `voltase` on the `DeviceLog` table. All the data in the column will be lost.
  - Added the required column `rawData` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rawData` to the `DeviceLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DeviceLog_deviceId_idx";

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "location" TEXT,
ADD COLUMN     "rawData" JSONB NOT NULL,
ALTER COLUMN "voltase" DROP NOT NULL,
ALTER COLUMN "voltase" DROP DEFAULT,
ALTER COLUMN "voltase" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "arus" DROP NOT NULL,
ALTER COLUMN "arus" DROP DEFAULT,
ALTER COLUMN "arus" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "suhu" DROP NOT NULL,
ALTER COLUMN "suhu" DROP DEFAULT,
ALTER COLUMN "suhu" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "kelembapan" DROP NOT NULL,
ALTER COLUMN "kelembapan" DROP DEFAULT,
ALTER COLUMN "kelembapan" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "thresholdIdle" DROP NOT NULL,
ALTER COLUMN "thresholdIdle" DROP DEFAULT,
ALTER COLUMN "thresholdIdle" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "thresholdDuty" DROP NOT NULL,
ALTER COLUMN "thresholdDuty" DROP DEFAULT,
ALTER COLUMN "thresholdDuty" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DeviceLog" DROP COLUMN "arus",
DROP COLUMN "kelembapan",
DROP COLUMN "suhu",
DROP COLUMN "voltase",
ADD COLUMN     "rawData" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "DeviceLog_deviceId_timestamp_idx" ON "DeviceLog"("deviceId", "timestamp");
