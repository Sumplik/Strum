import mqtt from "mqtt";

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

console.log("🔍 MQTT Subscriber - Monitoring 'mesin/telemetry/#'");
console.log(`Broker: ${MQTT_BROKER_URL}`);
console.log("Press Ctrl+C to stop...\n");

const client = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: `mqtt-subscriber-${Math.random().toString(16).slice(3)}`,
});

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  client.subscribe("mesin/telemetry/#", { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ Subscribe error:", err);
    } else {
      console.log("📡 Subscribed to 'mesin/telemetry/#'");
    }
  });
});

client.on("message", (topic, message) => {
  console.log(`📨 TOPIC: ${topic}`);
  console.log(`📨 PAYLOAD: ${message.toString()}`);
  console.log(`📨 JSON: ${tryParseJSON(message.toString())}`);
  console.log("─".repeat(80));
});

client.on("error", (err) => {
  console.error("❌ Error:", err.message);
});

function tryParseJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return "[Invalid JSON]";
  }
}

process.on("SIGINT", () => {
  console.log("\n👋 Disconnecting...");
  client.end();
  process.exit(0);
});

