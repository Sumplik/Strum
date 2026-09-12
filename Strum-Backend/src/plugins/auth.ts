import { Elysia } from "elysia";
import { jwtPlugin } from "./jwt";

export interface SessionUser {
  id: string;
  username: string;
}

function isSessionUser(value: unknown): value is SessionUser {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SessionUser).id === "string" &&
    typeof (value as SessionUser).username === "string"
  );
}

// Attaches `user` (or null) from the auth_session cookie to every route of the instance that uses it.
export const sessionPlugin = new Elysia({ name: "session" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, cookie: { auth_session } }) => {
    const token = auth_session?.value;
    if (typeof token !== "string" || !token) return { user: null as SessionUser | null };
    const payload = await jwt.verify(token);
    return { user: isSessionUser(payload) ? { id: payload.id, username: payload.username } : null };
  });

// Registered on a group before its routes so every route below it requires a valid session cookie.
export const requireAuth = new Elysia({ name: "require-auth" })
  .use(sessionPlugin)
  .onBeforeHandle({ as: "scoped" }, ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: "Tidak terautentikasi" };
    }
  })
  .as("scoped");
