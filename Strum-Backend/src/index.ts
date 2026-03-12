 
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { initMQTT } from "./mqtt.js";
import { authRoutes } from "./routes/auth.js";
import { apiRoutes } from "./routes/api.js";

// Jalankan background service
initMQTT();

const app = new Elysia()
  .use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://strum.ourblog.eu.org",
        "https://backend.ourblog.eu.org",
      ],
      credentials: true,
    }),
  )
  .use(authRoutes) // Endpoint Public (Login/Logout)
  .use(apiRoutes) // Endpoint Protected
  .listen(3001);

console.log(
  `🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`,
);
