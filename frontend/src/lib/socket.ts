import { io, type Socket } from "socket.io-client";

type Listener = (data: unknown) => void;

// Realtime push is opt-in: without VITE_SOCKET_URL the hooks fall back to polling, because
// the backend's Socket.IO server is not attached yet (see Strum-Backend/src/websocket.ts).
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
