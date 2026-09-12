import { createApp } from "./app";
import { config } from "./config";
import { prisma } from "./db";
import { isValidTimeZone } from "./lib/time";
import { startMqtt, stopMqtt } from "./mqtt";
import { refreshBranchCache } from "./services/branches";

if (!isValidTimeZone(config.timezone)) {
  console.error(`❌ TIMEZONE tidak valid: ${config.timezone}`);
  process.exit(1);
}

if (config.isJwtSecretFallback) {
  if (config.isProduction) {
    console.error("❌ JWT_SECRET wajib diisi saat NODE_ENV=production");
    process.exit(1);
  }
  console.warn("⚠️ JWT_SECRET belum diisi, memakai secret default yang tidak aman");
}

try {
  const branches = await refreshBranchCache();
  console.log(`🏢 ${branches.size} cabang terdaftar: ${[...branches].join(", ") || "-"}`);
  if (!branches.has(config.mqtt.legacyBranchId)) {
    console.warn(`⚠️ Cabang legacy ${config.mqtt.legacyBranchId} belum terdaftar; pesan dari topic lama akan ditolak sampai cabang itu dibuat`);
  }
} catch (error) {
  console.error("❌ Tidak bisa terhubung ke database:", error);
  process.exit(1);
}

const app = createApp().listen(config.port);
startMqtt();

console.log(`🦊 Backend berjalan di ${app.server?.hostname}:${app.server?.port} (zona waktu ${config.timezone})`);

async function shutdown(signal: string) {
  console.log(`\n👋 ${signal} diterima, mematikan server...`);
  await Promise.allSettled([stopMqtt(), app.stop(), prisma.$disconnect()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
