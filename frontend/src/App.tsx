import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/app/providers";
import { useDashboardRoute } from "@/app/router";
import { fmtDateTime } from "@/lib/utils";

import OverviewPage from "@/features/dashboard/pages/OverviewPage";
import MachinesPage from "@/features/dashboard/pages/MachinesPage";
import ReportsDailyPage from "@/features/dashboard/pages/ReportsDailyPage";
import TrendsPage from "@/features/dashboard/pages/TrendsPage";
import SettingsPage from "@/features/dashboard/pages/SettingsPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export default function App() {
  const { route, setRoute } = useDashboardRoute();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [showPageAnimation, setShowPageAnimation] = React.useState(false);
  const lastUpdateText = useLastUpdateTicker(3000);

  // Check for existing session on mount
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    // Verify auth with backend using cookie session
    const checkAuth = async () => {
      try {
        const response = await api.verifyAuth();
        if (response.success) {
          setIsLoggedIn(true);
        }
      } catch (e) {
        // Not authenticated
        setIsLoggedIn(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const pageTitle =
    route === "overview"
      ? "Overview"
      : route === "machines"
      ? "Monitoring Mesin"
      : route === "reports"
      ? "Summary Harian"
      : route === "trends"
      ? "Trend Mingguan/Bulanan"
      : "Pengaturan";

  const handleLoginSuccess = () => {
    setShowPageAnimation(true);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    // Show logout toast
    toast.info("Logout Berhasil", {
      description: "Anda telah keluar dari sistem",
      duration: 3000,
    });
    
    try {
      await api.logout();
    } catch (e) {
      // Ignore logout errors
    }
    setIsLoggedIn(false);
    setRoute("overview");
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    // Show loading while checking auth
    if (isCheckingAuth) {
      return (
        <Providers>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat...</span>
            </div>
          </div>
        </Providers>
      );
    }
    return (
      <Providers>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </Providers>
    );
  }

  return (
    <Providers>
      <div className={showPageAnimation ? "animate-page-in" : ""}>
        <AppShell
          route={route}
          onRouteChange={setRoute}
          title={pageTitle}
          subtitle="Availability Monitoring • ESP32 → MQTT → Server → PostgreSQL"
          mqttLabel="MQTT: Server Connected"
          lastUpdateText={lastUpdateText}
          onLogout={handleLogout}
        >
          {route === "overview" ? <OverviewPage /> : null}
          {route === "machines" ? <MachinesPage /> : null}
          {route === "reports" ? <ReportsDailyPage /> : null}
          {route === "trends" ? <TrendsPage /> : null}
          {route === "settings" ? <SettingsPage /> : null}
        </AppShell>
      </div>
    </Providers>
  );
}

