import * as React from "react";

export type DashboardRoute = "overview" | "machines" | "reports" | "trends" | "settings";

export function useDashboardRoute() {
  const [route, setRoute] = React.useState<DashboardRoute>("overview");
  return { route, setRoute };
}