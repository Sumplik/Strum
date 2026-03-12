import { Elysia, t } from "elysia";
import jwt from "@elysiajs/jwt";
import { prisma } from "../db.js";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "SUPER_SECRET_KEY",
    }),
  )
  .post(
    "/login",
    async ({ body, jwt, cookie: { auth_session }, set }) => {
      // 1. Cek User
      const user = await prisma.user.findUnique({
        where: { username: body.username },
      });

      // Menggunakan Bun.password untuk compare (pastikan saat create user di DB pakai Bun.password.hash)
      if (!user || !(await Bun.password.verify(body.password, user.password))) {
        set.status = 401;
        return { success: false, message: "Username atau password salah" };
      }

      // 2. Generate Token
      const token = await jwt.sign({ id: user.id, username: user.username });

      // 3. Set Cookie HttpOnly
      auth_session.set({
        value: token,
        httpOnly: true,
        maxAge: 7 * 86400, // 7 hari
        path: "/",
        sameSite: "none", // Allow cross-origin cookies (required for production)
        secure: true, // Required when sameSite is "none" (HTTPS only)
      });

      return { success: true, message: "Login berhasil" };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  )
  .post("/logout", async ({ cookie: { auth_session } }) => {
    auth_session.remove();
    return { success: true, message: "Logout berhasil" };
  })

  // 3. Verify Auth - Check if user is logged in
  .get(
    "/me",
    async ({ jwt, cookie: { auth_session }, set }) => {
      const profile = await jwt.verify(auth_session.value as string);
      if (!profile) {
        set.status = 401;
        return { success: false, message: "Not authenticated" };
      }
      return {
        success: true,
        user: { id: profile.id, username: profile.username },
      };
    },
  );
