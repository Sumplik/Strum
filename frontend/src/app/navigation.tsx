import { useState, type ReactNode } from "react";
import { BarChart3, LayoutDashboard, Settings, TrendingUp, Wrench } from "lucide-react";

export type DashboardRoute = "overview" | "machines" | "reports" | "trends" | "settings";

export const DASHBOARD_ROUTES: ReadonlyArray<{
  key: DashboardRoute;
  label: string;
  icon: ReactNode;
}> = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "machines", label: "Monitoring Mesin", icon: <Wrench className="h-4 w-4" /> },
  { key: "reports", label: "Summary Harian", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "trends", label: "Trend Mingguan/Bulanan", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "settings", label: "Pengaturan", icon: <Settings className="h-4 w-4" /> },
];

export function routeLabel(route: DashboardRoute): string {
  return DASHBOARD_ROUTES.find((item) => item.key === route)?.label ?? "";
}

export function useDashboardRoute() {
  const [route, setRoute] = useState<DashboardRoute>("overview");
  return { route, setRoute };
}
