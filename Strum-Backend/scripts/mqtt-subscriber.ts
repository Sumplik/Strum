// Prints every raw payload arriving on the telemetry topic; handy for debugging devices.
// Usage: bun run mqtt:watch
import mqtt from "mqtt";
import { config } from "../src/config";

function prettyJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return "[Invalid JSON]";
  }
}

const topic = `${config.mqtt.topicRoot}/#`;

console.log(`🔍 MQTT Subscriber - Monitoring '${topic}'`);
console.log(`Broker: ${config.mqtt.brokerUrl}`);
console.log("Press Ctrl+C to stop...\n");

const client = mqtt.connect(config.mqtt.brokerUrl, {
  username: config.mqtt.username,
  password: config.mqtt.password,
  clientId: `mqtt-subscriber-${Math.random().toString(16).slice(3)}`,
});

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  client.subscribe(topic, { qos: 1 }, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log(`📡 Subscribed to '${topic}'`);
  });
});

client.on("message", (topic, message) => {
  const raw = message.toString();
  console.log(`📨 TOPIC: ${topic}`);
  console.log(`📨 PAYLOAD: ${raw}`);
  console.log(`📨 JSON: ${prettyJson(raw)}`);
  console.log("─".repeat(80));
});

client.on("error", (err) => {
  console.error("❌ Error:", err.message);
});

process.on("SIGINT", () => {
  console.log("\n👋 Disconnecting...");
  client.end();
  process.exit(0);
});
