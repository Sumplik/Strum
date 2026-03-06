import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/app/providers";
import { useDashboardRoute } from "@/app/router";

import OverviewPage from "@/features/dashboard/pages/OverviewPage";
import MachinesPage from "@/features/dashboard/pages/MachinesPage";
import ReportsDailyPage from "@/features/dashboard/pages/ReportsDailyPage";
import TrendsPage from "@/features/dashboard/pages/TrendsPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

function useLastUpdateTicker(ms = 3000) {
  const [txt, setTxt] = React.useState<string>("Last update: -");

  React.useEffect(() => {
    const tick = () => setTxt(`Last update: ${new Date().toLocaleString("id-ID")}`);
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);

  return txt;
}

export default function App() {
  const { route, setRoute } = useDashboardRoute();
  const [notifEnabled, setNotifEnabled] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
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

  // notif request permission
  React.useEffect(() => {
    if (!notifEnabled) return;
    if (!("Notification" in window)) {
      setNotifEnabled(false);
      alert("Browser tidak support Notification API.");
      return;
    }
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") {
      setNotifEnabled(false);
      alert("Izin notifikasi ditolak. Silakan aktifkan dari browser setting.");
      return;
    }
    Notification.requestPermission().then((p) => {
      if (p !== "granted") {
        setNotifEnabled(false);
        alert("Izin notifikasi tidak diberikan.");
      }
    });
  }, [notifEnabled]);

  const pageTitle =
    route === "overview"
      ? "Overview"
      : route === "machines"
      ? "Monitoring Mesin"
      : route === "reports"
      ? "Summary Harian"
      : "Trend Mingguan/Bulanan";

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
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
      <AppShell
        route={route}
        onRouteChange={setRoute}
        title={pageTitle}
        subtitle="Availability Monitoring • ESP32 → MQTT → Server → PostgreSQL"
        mqttLabel="MQTT: Server Connected"
        lastUpdateText={lastUpdateText}
        notifEnabled={notifEnabled}
        onNotifToggle={setNotifEnabled}
        onLogout={handleLogout}
      >
        {route === "overview" ? <OverviewPage /> : null}
        {route === "machines" ? <MachinesPage /> : null}
        {route === "reports" ? <ReportsDailyPage /> : null}
        {route === "trends" ? <TrendsPage /> : null}
      </AppShell>
    </Providers>
  );
}

