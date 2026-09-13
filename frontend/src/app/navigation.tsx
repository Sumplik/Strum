import { useState, type ReactNode } from "react";
import { BarChart3, LayoutDashboard, Settings, TrendingUp, Wrench } from "lucide-react";

export type DashboardRoute = "overview" | "machines" | "reports" | "trends" | "settings";

interface RouteDefinition {
  key: DashboardRoute;
  label: string;
  icon: ReactNode;
  // Dropdown cabang di topbar menawarkan "Semua cabang" (halaman yang isinya bisa lintas cabang).
  allowAllBranches: boolean;
}

export const DASHBOARD_ROUTES: ReadonlyArray<RouteDefinition> = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, allowAllBranches: false },
  { key: "machines", label: "Monitoring Mesin", icon: <Wrench className="h-4 w-4" />, allowAllBranches: true },
  { key: "reports", label: "Summary Harian", icon: <BarChart3 className="h-4 w-4" />, allowAllBranches: true },
  { key: "trends", label: "Trend Mingguan/Bulanan", icon: <TrendingUp className="h-4 w-4" />, allowAllBranches: true },
  { key: "settings", label: "Pengaturan", icon: <Settings className="h-4 w-4" />, allowAllBranches: false },
];

const routeDefinition = (route: DashboardRoute) => DASHBOARD_ROUTES.find((item) => item.key === route);

export function routeLabel(route: DashboardRoute): string {
  return routeDefinition(route)?.label ?? "";
}

export function routeAllowsAllBranches(route: DashboardRoute): boolean {
  return routeDefinition(route)?.allowAllBranches ?? false;
}

export function useDashboardRoute() {
  const [route, setRoute] = useState<DashboardRoute>("overview");
  return { route, setRoute };
}
