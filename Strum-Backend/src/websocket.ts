import { Server as SocketServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketServer | null = null;

export function initSocket(httpServer: HTTPServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ Socket.IO server initialized");
  return io;
}

// Overload for Elysia server (which has a similar interface)
export function initSocketElysia(server: any) {
  // Elysia's server is an HTTP server with additional properties
  io = new SocketServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ Socket.IO server initialized");
  return io;
}

export function getIO() {
  return io;
}

// Broadcast device update to all connected clients
export function broadcastDeviceUpdate(data: any) {
  if (io) {
    io.emit("device:update", data);
  }
}

// Broadcast stats update to all connected clients
export function broadcastStatsUpdate(data: any) {
  if (io) {
    io.emit("stats:update", data);
  }
}

