import mqtt from "mqtt";
import { prisma } from "./db";
import { Server as SocketServer } from "socket.io";

let io: SocketServer | { emit: (event: string, data: any) => void } | null = null;

const messageQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

let cachedStats = {
  total: 0,
  on: 0,
  onDuty: 0,
  idle: 0,
  off: 0,
  online: 0,
  disconnect: 0,
  percentOnDuty: 0,
  percentIdle: 0,
  percentOff: 0,
};
let lastStatsBroadcast = 0;
const STATS_BROADCAST_INTERVAL = 1000;

export function setSocketIO(socketIO: SocketServer | { emit: (event: string, data: any) => void }) {
  io = socketIO as any;
}

function broadcastDeviceUpdate(data: any) {
  if (io) {
    io.emit("device:update", { type: "device:update", data });
  }
}

function broadcastStatsUpdate(data: any) {
  if (io) {
    io.emit("stats:update", { type: "stats:update", data });
  }
}

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;
  
  isProcessing = true;
  console.log(`📥 Processing queue: ${messageQueue.length} messages pending`);
  
  while (messageQueue.length > 0) {
    const processMessage = messageQueue[0];
    if (processMessage) {
      try {
        await processMessage();
        messageQueue.shift();
      } catch (error) {
        console.error("❌ Error processing queued MQTT message:", error);
        messageQueue.shift();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  isProcessing = false;
  console.log("✅ Queue processing complete");
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorCode = (error as any)?.code;
      if (errorCode !== 'P2028' && errorCode !== 'P1008' && !errorMessageIncludes(error, 'transaction')) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⚠️ Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

function errorMessageIncludes(error: any, text: string): boolean {
  const message = error?.message?.toString()?.toLowerCase() || '';
  return message.includes(text.toLowerCase());
}

export function initMQTT() {
  const mqttClient = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: `backend-server-${Math.random().toString(16).slice(3)}`,
    },
  );

  mqttClient.on("connect", () => {
    console.log("✅ Connected to Mosquitto Broker");
    mqttClient.subscribe("mesin/telemetry/#");
    mqttClient.subscribe("mesin/telemetry");
  });

  mqttClient.on("message", async (topic: string, message: Buffer) => {
    if (topic.startsWith("mesin/telemetry")) {
      messageQueue.push(() => processTelemetryMessage(message));
      processQueue();
    }
  });
}

async function processTelemetryMessage(message: Buffer) {
  try {
    const payload = JSON.parse(message.toString());
    if (!payload.device_id || !payload.data) return;

    // Handle timestamp
    let timestamp: Date;
    const tsValue = payload.connection?.ts;
    if (typeof tsValue === 'number') {
      timestamp = new Date(tsValue > 9999999999 ? tsValue : tsValue * 1000);
    } else if (typeof tsValue === 'string') {
      timestamp = new Date(tsValue.replace(' ', 'T'));
    } else {
      timestamp = new Date();
    }

    // Handle status - override berdasarkan arus dan threshold
    let statusMesin: string;
    const rawStatus = payload.data.status_mesin?.toString().toLowerCase();
    const arus = payload.data?.arus ?? 0;
    const threshold = payload.threshold ?? 0;
    
    // Jika OFF, tetap OFF (mesin mati)
    if (rawStatus === 'off') {
      statusMesin = 'off';
    } else {
      // Hitung status berdasarkan arus dan threshold
      if (arus >= threshold) {
        statusMesin = 'on_duty';
      } else {
        statusMesin = 'idle';
      }
    }

    const ipAddress = payload.connection?.ipaddress || null;
    const voltase = payload.data?.voltase || null;
    const suhu = payload.data?.suhu || null;
    const kelembapan = payload.data?.kelembapan || null;
    const thresholdDuty = payload.threshold || null;
    const location = payload.location || null;

    await withRetry(async () => {
      await prisma.device.upsert({
        where: { id: payload.device_id },
        update: {
          status: statusMesin,
          lastSeen: timestamp,
          rawData: payload,
          ipAddress,
          voltase,
          arus,
          suhu,
          kelembapan,
          thresholdDuty,
          location,
        },
        create: {
          id: payload.device_id,
          status: statusMesin,
          lastSeen: timestamp,
          rawData: payload,
          ipAddress,
          voltase,
          arus,
          suhu,
          kelembapan,
          thresholdDuty,
          location,
        },
      });
    });

    await withRetry(async () => {
      await prisma.deviceLog.create({
        data: {
          deviceId: payload.device_id,
          timestamp: timestamp,
          status: statusMesin,
          rawData: payload,
        },
      });
    });

    broadcastDeviceUpdate({
      device_id: payload.device_id,
      status: statusMesin,
      lastSeen: timestamp,
      location,
      voltase,
      arus,
      suhu,
      kelembapan,
    });

    cachedStats.total = await prisma.device.count();
    cachedStats.onDuty = await prisma.device.count({ where: { status: "on_duty" } });
    cachedStats.idle = await prisma.device.count({ where: { status: "idle" } });
    cachedStats.off = await prisma.device.count({ where: { status: "off" } });

    const disconnectThreshold = new Date(Date.now() - 6 * 60 * 1000);

    cachedStats.online = await prisma.device.count({
      where: {
        lastSeen: {
          gt: disconnectThreshold,
        },
      },
    });

    cachedStats.disconnect = cachedStats.total - cachedStats.online;
    cachedStats.on = cachedStats.onDuty + cachedStats.idle;

    cachedStats.percentOnDuty =
      cachedStats.on > 0
        ? Math.round((cachedStats.onDuty / cachedStats.on) * 1000) / 10
        : 0;

    cachedStats.percentIdle =
      cachedStats.on > 0
        ? Math.round((cachedStats.idle / cachedStats.on) * 1000) / 10
        : 0;

    cachedStats.percentOff =
      cachedStats.total > 0
        ? Math.round((cachedStats.off / cachedStats.total) * 1000) / 10
        : 0;

    const now = Date.now();
    if (now - lastStatsBroadcast >= STATS_BROADCAST_INTERVAL) {
      broadcastStatsUpdate(cachedStats);
      lastStatsBroadcast = now;
    }

  } catch (error) {
    console.error("❌ Error processing MQTT message:", error);
  }
}
setInterval(async () => {
  try {
    const total = await prisma.device.count();
    const onDuty = await prisma.device.count({ where: { status: "on_duty" } });
    const idle = await prisma.device.count({ where: { status: "idle" } });
    const off = await prisma.device.count({ where: { status: "off" } });

    const disconnectThreshold = new Date(Date.now() - 6 * 60 * 1000);

    const online = await prisma.device.count({
      where: {
        lastSeen: {
          gt: disconnectThreshold,
        },
      },
    });

    const disconnect = total - online;
    const on = onDuty + idle;

    const percentOnDuty =
      on > 0 ? Math.round((onDuty / on) * 1000) / 10 : 0;

    const percentIdle =
      on > 0 ? Math.round((idle / on) * 1000) / 10 : 0;

    const percentOff =
      total > 0 ? Math.round((off / total) * 1000) / 10 : 0;

    cachedStats = {
      total,
      on,
      onDuty,
      idle,
      off,
      online,
      disconnect,
      percentOnDuty,
      percentIdle,
      percentOff,
    };

    broadcastStatsUpdate(cachedStats);
  } catch (err) {
    console.error("❌ Err or updating stats interval:", err);
  }
}, 5000); // tiap 5 detik