import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { routeLabel, useDashboardRoute } from "@/app/navigation";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";

import OverviewPage from "@/features/dashboard/pages/OverviewPage";
import MachinesPage from "@/features/dashboard/pages/MachinesPage";
import ReportsDailyPage from "@/features/dashboard/pages/ReportsDailyPage";
import TrendsPage from "@/features/dashboard/pages/TrendsPage";
import SettingsPage from "@/features/dashboard/pages/SettingsPage";
import LoginPage from "@/features/auth/pages/LoginPage";

function useLastUpdateTicker(ms = 3000) {
  const [txt, setTxt] = React.useState<string>("Last update: -");

  React.useEffect(() => {
    const tick = () => setTxt(`Last update: ${fmtDateTime(new Date())}`);
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);

  return txt;
}

function useSessionCheck() {
  const [status, setStatus] = React.useState<"checking" | "in" | "out">("checking");

  React.useEffect(() => {
    api
      .verifyAuth()
      .then((response) => setStatus(response.success ? "in" : "out"))
      .catch(() => setStatus("out"));
  }, []);

  return { status, setStatus };
}

export default function App() {
  const { route, setRoute } = useDashboardRoute();
  const { status, setStatus } = useSessionCheck();
  const [showPageAnimation, setShowPageAnimation] = React.useState(false);
  const lastUpdateText = useLastUpdateTicker(3000);

  const handleLoginSuccess = () => {
    setShowPageAnimation(true);
    setStatus("in");
  };

  const handleLogout = async () => {
    toast.info("Logout Berhasil", {
      description: "Anda telah keluar dari sistem",
      duration: 3000,
    });

    try {
      await api.logout();
    } catch {
      // The local session is dropped regardless of whether the server call succeeds.
    }
    setStatus("out");
    setRoute("overview");
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat...</span>
        </div>
      </div>
    );
  }

  if (status === "out") {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={showPageAnimation ? "animate-page-in" : ""}>
      <AppShell
        route={route}
        onRouteChange={setRoute}
        title={routeLabel(route)}
        subtitle="Availability Monitoring • ESP32 → MQTT → Server → PostgreSQL"
        lastUpdateText={lastUpdateText}
        onLogout={handleLogout}
      >
        {route === "overview" && <OverviewPage />}
        {route === "machines" && <MachinesPage />}
        {route === "reports" && <ReportsDailyPage />}
        {route === "trends" && <TrendsPage />}
        {route === "settings" && <SettingsPage />}
      </AppShell>
    </div>
  );
}
