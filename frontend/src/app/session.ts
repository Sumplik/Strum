import * as React from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Dipancarkan (window event) saat server menjawab 401 untuk data yang butuh login.
export const SESSION_EXPIRED_EVENT = "strum:session-expired";

export type SessionStatus = "checking" | "in" | "out";

// Memeriksa cookie sesi saat aplikasi dibuka, dan keluar otomatis saat sesi kedaluwarsa.
export function useSession() {
  const [status, setStatus] = React.useState<SessionStatus>("checking");

  React.useEffect(() => {
    api
      .verifyAuth()
      .then((response) => setStatus(response.success ? "in" : "out"))
      .catch(() => setStatus("out"));
  }, []);

  React.useEffect(() => {
    const onExpired = () => {
      setStatus((current) => {
        if (current === "in") toast.info("Sesi berakhir", { description: "Silakan login kembali." });
        return "out";
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return { status, setStatus };
}
