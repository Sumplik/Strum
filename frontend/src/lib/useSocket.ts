import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = 
  (import.meta as any).env.VITE_WS_URL?.toString().trim() ||
  "ws://localhost:3001/ws";

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

export function getSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      console.log("🔌 Connected to WebSocket server");
      reconnectAttempts = 0;
    };
    
    socket.onclose = () => {
      console.log("❌ Disconnected from WebSocket server");
      socket = null;
      
      // Auto reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}`);
        setTimeout(() => {
          getSocket();
        }, RECONNECT_DELAY * reconnectAttempts);
      }
    };
    
    socket.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
    };
  }
  return socket;
}

export function useWebSocket<T>(event: string, onMessage: (data: T) => void) {
  const onMessageRef = useRef(onMessage);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const ws = getSocket();
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === event) {
          onMessageRef.current(message.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    ws.addEventListener("message", handleMessage);
    
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [event]);
}

// Hook for getting real-time device updates
export function useRealtimeDevices(initialDevices: any[]) {
  const [devices, setDevices] = useState(initialDevices);

  const handleDeviceUpdate = useCallback((updatedDevice: any) => {
    setDevices((prev) => {
      const index = prev.findIndex((d: any) => d.id === updatedDevice.device_id);
      if (index >= 0) {
        const newDevices = [...prev];
        newDevices[index] = {
          ...newDevices[index],
          ...updatedDevice,
        };
        return newDevices;
      }
      return prev;
    });
  }, []);

  useWebSocket<any>("device:update", handleDeviceUpdate);

  return devices;
}

// Hook for getting real-time stats
export function useRealtimeStats(initialStats: any) {
  const [stats, setStats] = useState(initialStats);

  const handleStatsUpdate = useCallback((newStats: any) => {
    setStats(newStats);
  }, []);

  useWebSocket<any>("stats:update", handleStatsUpdate);

  return stats;
}

