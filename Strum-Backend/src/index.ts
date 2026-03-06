import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import jwt from "@elysiajs/jwt";
import { initMQTT } from "./mqtt.js";
import { authRoutes } from "./routes/auth.js";
import { apiRoutes } from "./routes/api.js";

// JWT config
const jwtConfig = {
  name: "jwt",
  secret: process.env.JWT_SECRET || "SUPER_SECRET_KEY",
};

// Jalankan background service
initMQTT();

const app = new Elysia()
  .use(cors({
    origin: true,
    credentials: true,
  }))
  .use(jwt(jwtConfig))
  .use(authRoutes) // Endpoint Public (Login/Logout)
  .use(apiRoutes) // Endpoint Public (Devices & Summary)
  .listen(3001);

console.log(
  `🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`,
);
