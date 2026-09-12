import jwt from "@elysiajs/jwt";
import { config } from "../config";

export const jwtPlugin = jwt({
  name: "jwt",
  secret: config.jwtSecret,
});
