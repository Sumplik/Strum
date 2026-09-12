import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { config, SESSION_MAX_AGE_SECONDS } from "../config";
import { tooManyRequests, unauthorized } from "../lib/errors";
import { RateLimiter } from "../lib/rateLimit";
import { sessionPlugin } from "../plugins/auth";

const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);

const passwordSchema = t.String({ minLength: 8, maxLength: 128 });

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(sessionPlugin)
  .post(
    "/login",
    async ({ body, jwt, cookie: { auth_session }, server, request }) => {
      const username = body.username.trim();
      const ip = server?.requestIP(request)?.address ?? "unknown";
      const limiterKey = `${ip}|${username.toLowerCase()}`;

      const attempt = loginLimiter.hit(limiterKey);
      if (!attempt.allowed) {
        throw tooManyRequests(`Terlalu banyak percobaan login, coba lagi dalam ${attempt.retryAfterSeconds} detik`);
      }

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !(await Bun.password.verify(body.password, user.password))) {
        throw unauthorized("Username atau password salah");
      }

      loginLimiter.reset(limiterKey);
      const token = await jwt.sign({ id: user.id, username: user.username });

      auth_session.set({
        value: token,
        httpOnly: true,
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: config.cookieSecure,
      });

      return { success: true, data: { id: user.id, username: user.username } };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1, maxLength: 64 }),
        password: t.String({ minLength: 1, maxLength: 128 }),
      }),
    },
  )
  .post("/logout", ({ cookie: { auth_session } }) => {
    auth_session.remove();
    return { success: true, message: "Logout berhasil" };
  })
  .get("/me", ({ user }) => {
    if (!user) throw unauthorized();
    return { success: true, data: user };
  })
  .put(
    "/password",
    async ({ user, body }) => {
      if (!user) throw unauthorized();

      const record = await prisma.user.findUnique({ where: { id: user.id } });
      if (!record || !(await Bun.password.verify(body.currentPassword, record.password))) {
        throw unauthorized("Password saat ini salah");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { password: await Bun.password.hash(body.newPassword) },
      });
      return { success: true, message: "Password berhasil diubah" };
    },
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 1, maxLength: 128 }),
        newPassword: passwordSchema,
      }),
    },
  );
