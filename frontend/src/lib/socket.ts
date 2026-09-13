import { io, type Socket } from "socket.io-client";

type Listener = (data: unknown) => void;

// Realtime push is opt-in: without VITE_SOCKET_URL the hooks rely on polling, because the
// backend does not run a Socket.IO server yet. When it does, emit "device:update" per ingestion.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || "";

const listeners = new Map<string, Set<Listener>>();
let socket: Socket | null = null;

function connect(): Socket | null {
  if (!SOCKET_URL) return null;
  if (socket) return socket;

  socket = io(SOCKET_URL, { withCredentials: true });
  socket.onAny((event: string, data: unknown) => {
    listeners.get(event)?.forEach((listener) => listener(data));
  });
  return socket;
}

export function on(event: string, listener: Listener): () => void {
  connect();

  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)?.add(listener);

  return () => {
    listeners.get(event)?.delete(listener);
  };
}
