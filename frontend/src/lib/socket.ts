import { io, Socket } from "socket.io-client";

// Socket is disabled for demo - uncomment below and set up Socket.IO server to enable
const SOCKET_URL = ""; // Set to your Socket.IO server URL to enable

let socket: Socket | null = null;

// Event listeners
const listeners: Map<string, Set<(data: any) => void>> = new Map();

export function connectSocket() {
  // Socket.IO disabled - using API polling instead
  console.log("📡 Socket: Using API polling (Socket.IO disabled for demo)");
  return null;
}

// Subscribe to events
export function on(event: string, callback: (data: any) => void) {
  // Ensure socket is connected
  if (!socket?.connected) {
    connectSocket();
  }
  
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)?.add(callback);
  
  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(callback);
  };
}

// Emit event (for sending to server if needed)
export function emit(event: string, data: any) {
  if (socket?.connected) {
    socket.emit(event, data);
  }
}

// Socket instance for direct access
export function getSocket() {
  if (!socket?.connected) {
    connectSocket();
  }
  return socket;
}

// Initialize connection
connectSocket();

