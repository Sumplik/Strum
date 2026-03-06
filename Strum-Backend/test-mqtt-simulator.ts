/**
 * MQTT Test Simulator
 * 
 * This script simulates device telemetry data being sent via MQTT.
 * Run this script to test the complete flow:
 * Device → MQTT → Backend → Database → Frontend
 * 
 * Usage:
 * 1. Ensure backend is running: cd Strum-Backend && bun run src/index.ts
 * 2. Run this script: bun run test-mqtt-simulator.ts
 * 
 * Or use Node.js with mqtt package:
 * npm install mqtt && node test-mqtt-simulator.js
 */

import mqtt from "mqtt";

// Configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

// Simulated devices
const devices = [
  { device_id: "MESIN-001", location: "W1" },
  { device_id: "MESIN-002", location: "W2" },
  { device_id: "MESIN-003", location: "W3" },
];

// Status values to simulate
const statuses = ["off", "idle", "on_duty"];

// Helper to generate random telemetry payload
function generatePayload(deviceId: string, location: string) {
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const baseTime = Math.floor(Date.now() / 1000);
  
  return {
    device_id: deviceId,
    location: location,
    connection: {
      ts: baseTime,
      ipaddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    },
    data: {
      status_mesin: status,
      voltase: 220 + Math.random() * 20,
      arus: Math.random() * 10,
      suhu: 30 + Math.random() * 20,
      kelembapan: 40 + Math.random() * 30,
    },
    threshold: 0.5,
  };
}

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: `test-simulator-${Math.random().toString(16).slice(3)}`,
});

client.on("connect", () => {
  console.log("✅ Test simulator connected to MQTT broker");
  
  // Send initial telemetry for all devices
  console.log("\n📤 Sending initial telemetry data...");
  
  devices.forEach((device, index) => {
    const payload = generatePayload(device.device_id, device.location);
    
    setTimeout(() => {
      client.publish("mesin/telemetry", JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`❌ Error publishing for ${device.device_id}:`, err);
        } else {
          console.log(`   ✓ ${device.device_id}: ${payload.data.status_mesin}`);
        }
      });
    }, index * 500); // Stagger messages
  });

  // Send status changes after a delay to create log entries
  setTimeout(() => {
    console.log("\n📤 Sending status changes to create logs...");
    
    devices.forEach((device, index) => {
      // Change status to create different log entries
      const newStatus = statuses[(index + 1) % statuses.length];
      const payload = generatePayload(device.device_id, device.location);
      payload.data.status_mesin = newStatus;
      
      setTimeout(() => {
        client.publish("mesin/telemetry", JSON.stringify(payload), { qos: 1 }, (err) => {
          if (err) {
            console.error(`❌ Error publishing for ${device.device_id}:`, err);
          } else {
            console.log(`   ✓ ${device.device_id}: ${payload.data.status_mesin}`);
          }
        });
      }, index * 500);
    });
  }, 3000);

  // Disconnect after all messages sent
  setTimeout(() => {
    console.log("\n✅ Test data sent successfully!");
    console.log("\n📋 Next steps:");
    console.log("   1. Check backend console for received messages");
    console.log("   2. Query API: GET http://localhost:3001/api/stats");
    console.log("   3. Query API: GET http://localhost:3001/api/summary/harian/YYYY-MM-DD");
    console.log("   4. Check frontend dashboard for updated values");
    client.end();
    process.exit(0);
  }, 6000);
});

client.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err.message);
  console.log("\nMake sure:");
  console.log("   1. MQTT broker is running (e.g., Mosquitto)");
  console.log("   2. Backend is running and listening for MQTT messages");
  console.log("   3. MQTT broker credentials are correct if required");
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚠️  Shutting down...");
  client.end();
  process.exit(0);
});

