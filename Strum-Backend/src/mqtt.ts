import mqtt, { type MqttClient } from "mqtt";
import { config } from "./config";
import { ingestMessage } from "./services/ingestion";

const MAX_QUEUE = 10_000;
const RETRYABLE_PRISMA_CODES = new Set(["P2028", "P1008", "P1001", "P1002", "P1017"]);

interface QueuedMessage {
  topic: string;
  payload: Buffer;
  receivedAt: Date;
}

const queue: QueuedMessage[] = [];
let draining = false;
let dropped = 0;
let client: MqttClient | null = null;

const state = {
  connected: false,
  broker: config.mqtt.brokerUrl,
  topic: `${config.mqtt.topicRoot}/#`,
  lastConnectedAt: null as Date | null,
  lastError: null as string | null,
  queued: 0,
  dropped: 0,
};

export function getMqttState() {
  return { ...state, queued: queue.length, dropped };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = ((error as Error)?.message ?? "").toLowerCase();
  return (code !== undefined && RETRYABLE_PRISMA_CODES.has(code)) || message.includes("transaction");
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 200): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      lastError = error;
      await sleep(baseDelay * 2 ** attempt);
    }
  }
  throw lastError;
}

async function processMessage({ topic, payload, receivedAt }: QueuedMessage) {
  try {
    const outcome = await withRetry(() => ingestMessage(topic, payload, receivedAt));
    if (outcome.status === "rejected") {
      console.warn(`⚠️ Telemetri ditolak (${outcome.reason}): ${outcome.message}`);
    } else if (outcome.status === "stored" && outcome.warnings.length) {
      console.warn(`⚠️ ${outcome.branchId}/${outcome.code}: ${outcome.warnings.join("; ")}`);
    }
  } catch (error) {
    console.error(`❌ Gagal menyimpan telemetri dari ${topic}:`, error);
  }
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  while (queue.length > 0) {
    await processMessage(queue.shift()!);
  }
  draining = false;
}

export function enqueue(topic: string, payload: Buffer) {
  if (queue.length >= MAX_QUEUE) {
    queue.shift();
    dropped += 1;
  }
  queue.push({ topic, payload, receivedAt: new Date() });
  void drainQueue();
}

export function startMqtt(): MqttClient {
  client = mqtt.connect(config.mqtt.brokerUrl, {
    username: config.mqtt.username,
    password: config.mqtt.password,
    clientId: `strum-backend-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 5000,
    connectTimeout: 15_000,
    clean: true,
  });

  client.on("connect", () => {
    state.connected = true;
    state.lastConnectedAt = new Date();
    state.lastError = null;
    console.log(`✅ MQTT terhubung ke ${config.mqtt.brokerUrl}`);
    client?.subscribe(state.topic, { qos: 1 }, (err) => {
      if (err) console.error("❌ Gagal subscribe:", err.message);
      else console.log(`📡 Subscribe ${state.topic}`);
    });
  });

  client.on("message", (topic, payload) => enqueue(topic, payload));
  client.on("reconnect", () => console.log("🔄 MQTT mencoba reconnect..."));
  client.on("close", () => {
    state.connected = false;
  });
  client.on("error", (error) => {
    state.lastError = error.message;
    console.error("❌ MQTT error:", error.message);
  });

  return client;
}

export async function stopMqtt(): Promise<void> {
  if (!client) return;
  await new Promise<void>((resolve) => client!.end(false, {}, () => resolve()));
  client = null;
  state.connected = false;
}
