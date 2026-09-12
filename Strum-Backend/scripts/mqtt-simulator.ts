// Publishes fake telemetry for a few machines in one branch so the whole pipeline can be exercised.
// Usage: bun run mqtt:simulate [BRANCH_ID]   (default UP2W1; backend must be running)
import mqtt from "mqtt";
import { config } from "../src/config";

const branchId = (process.argv[2] ?? "UP2W1").toUpperCase();
const topic = `${config.mqtt.topicRoot}/${branchId}`;

const devices = [
  { device_id: "6CNC1", location: "Ruang CNC" },
  { device_id: "MESIN-002", location: "W2" },
  { device_id: "MESIN-003", location: "W3" },
];

const statuses = ["OFF", "ON", "ON"] as const;

function generatePayload(deviceId: string, location: string, status?: string) {
  return {
    device_id: deviceId,
    location,
    version: "1.0",
    threshold: 22,
    connection: {
      ts: Math.floor(Date.now() / 1000),
      ipaddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    },
    data: {
      status_mesin: status ?? statuses[Math.floor(Math.random() * statuses.length)],
      arus: Math.random() * 40,
      voltase: 220 + Math.random() * 5,
      suhu: 30 + Math.random() * 20,
      kelembapan: 40 + Math.random() * 30,
    },
  };
}

const client = mqtt.connect(config.mqtt.brokerUrl, {
  username: config.mqtt.username,
  password: config.mqtt.password,
  clientId: `strum-simulator-${Math.random().toString(16).slice(2, 10)}`,
});

function publishAll(label: string, pickStatus: (index: number) => string | undefined) {
  console.log(`\n📤 ${label}`);
  devices.forEach((device, index) => {
    const payload = generatePayload(device.device_id, device.location, pickStatus(index));
    setTimeout(() => {
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) console.error(`❌ Gagal publish ${device.device_id}:`, err);
        else console.log(`   ✓ ${topic} ${device.device_id}: ${payload.data.status_mesin} (arus ${payload.data.arus.toFixed(1)})`);
      });
    }, index * 500);
  });
}

client.on("connect", () => {
  console.log(`✅ Simulator terhubung ke broker, cabang ${branchId}`);

  publishAll("Mengirim telemetri awal...", () => undefined);
  setTimeout(() => publishAll("Mengirim perubahan status...", (index) => statuses[(index + 1) % statuses.length]), 3000);

  setTimeout(() => {
    console.log("\n✅ Selesai. Cek:");
    console.log(`   GET http://localhost:${config.port}/api/branches/${branchId}/devices`);
    console.log(`   GET http://localhost:${config.port}/api/branches/${branchId}/summary?start=YYYY-MM-DD&end=YYYY-MM-DD`);
    client.end();
    process.exit(0);
  }, 6000);
});

client.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err.message);
  process.exit(1);
});

process.on("SIGINT", () => {
  client.end();
  process.exit(0);
});
