import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, LayoutDashboard, Wrench, BarChart3, TrendingUp, Menu, LogOut } from "lucide-react";
import { useTheme } from "@/app/theme";
import type { DashboardRoute } from "@/app/router";
import { DashboardKpis } from "@/features/dashboard/components/DashboardKpis";

type Props = {
  route: DashboardRoute;
  onRouteChange: (r: DashboardRoute) => void;

  title: string;
  subtitle?: string;

  mqttLabel?: string;
  lastUpdateText?: string;

  notifEnabled: boolean;
  onNotifToggle: (v: boolean) => void;

  onLogout?: () => void;

  children: React.ReactNode;
};

const navItems: Array<{
  key: DashboardRoute;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "machines", label: "Monitoring Mesin", icon: <Wrench className="h-4 w-4" /> },
  { key: "reports", label: "Summary Harian", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "trends", label: "Trend Mingguan/Bulanan", icon: <TrendingUp className="h-4 w-4" /> },
];

function SidebarContent({
  route,
  onRouteChange,
  onLogout,
}: {
  route: DashboardRoute;
  onRouteChange: (r: DashboardRoute) => void;
  onLogout?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  
  // Theme-aware colors with proper elevation
  // Dark mode: #0F172A background, #1E293B surface (elevated), #334155 cards
  // Light mode: #F8FAFC background, #FFFFFF surface, #F1F5F9 cards
  const sidebarBg = isDark ? "bg-[#0F172A]" : "bg-[#F8FAFC]";
  const cardBg = isDark ? "bg-[#1E293B]" : "bg-white";
  const cardBorder = isDark ? "border-slate-700/50" : "border-slate-200";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-600";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const itemBg = isDark ? "bg-[#1E293B]/50" : "bg-slate-50";
  const itemBorder = isDark ? "border-slate-700/50" : "border-slate-200";
  const itemHoverBg = isDark ? "hover:bg-[#1E293B]" : "hover:bg-slate-100";
  const itemHoverBorder = isDark ? "hover:border-slate-600" : "hover:border-slate-300";
  const iconBg = isDark ? "bg-[#334155]" : "bg-slate-100";
  const iconBorder = isDark ? "border-slate-700" : "border-slate-200";
  
  // Accent color - Blue for dark, Blue for light
  const accentColor = isDark ? "text-blue-400" : "text-blue-600";
  const accentBg = isDark ? "bg-blue-500/15" : "bg-blue-50";
  const accentBorder = isDark ? "border-blue-500/30" : "border-blue-200";
  
  return (
    <div className={cn("flex h-full flex-col gap-3", sidebarBg)}>
      {/* Logo Header */}
      <div className={cn("rounded-2xl border p-3", cardBorder, cardBg)}>
        <div className="flex items-center gap-3">
          <div className={cn("grid h-10 w-10 place-items-center rounded-xl border font-bold text-sm", 
            isDark ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-blue-400/50 bg-blue-50 text-blue-600")}>
            ST
          </div>
          <div className={textPrimary}>
            <div className="text-sm font-bold leading-tight">STRUM Dashboard</div>
            <div className={cn("text-[11px] font-medium", textMuted)}>PUSHARLIS UP2W VI</div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-1">
        {navItems.map((it) => {
          const active = it.key === route;
          return (
            <button
              key={it.key}
              onClick={() => onRouteChange(it.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200",
                "hover:scale-[1.01] active:scale-[0.99]",
                active
                  ? cn("border-blue-500/30", accentBg, accentColor, "font-medium")
                  : cn(itemBorder, itemBg, textSecondary, itemHoverBg, itemHoverBorder),
              )}
            >
              <span className={cn(
                "grid h-7 w-7 place-items-center rounded-lg border",
                active 
                  ? cn(accentBorder, accentBg)
                  : cn(iconBorder, iconBg)
              )}>
                {it.icon}
              </span>
              <span className="font-medium">{it.label}</span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle - Same style as nav items, above logout */}
      <button
        onClick={toggleTheme}
        className={cn(
          "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200",
          "hover:scale-[1.01] active:scale-[0.99]",
          itemBorder, itemBg, textSecondary, itemHoverBg, itemHoverBorder,
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg border", iconBorder, iconBg)}>
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </span>
          <span className="font-medium">
            {isDark ? "Mode Terang" : "Mode Gelap"}
          </span>
        </span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-semibold",
          isDark ? "bg-amber-500/20 text-amber-400" : "bg-blue-100 text-blue-600"
        )}>
          ON
        </span>
      </button>

{/* Logout Button */}
      <button
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200",
          "hover:scale-[1.01] active:scale-[0.99]",
          isDark 
            ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30"
            : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300",
        )}
        onClick={onLogout}
      >
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg border",
          isDark ? "border-red-500/20 bg-red-500/10" : "border-red-200 bg-red-50")}>
          <LogOut className="h-4 w-4" />
        </span>
        <span className="font-medium">Logout</span>
      </button>
    </div>
  );
}

export function AppShell(props: Props) {
  const { theme } = useTheme();
  const {
    route,
    onRouteChange,
    title,
    subtitle,
    mqttLabel,
    lastUpdateText,
    notifEnabled,
    onNotifToggle,
    onLogout,
    children,
  } = props;

  const isDark = theme === "dark";
  
  // Theme-aware colors with proper elevation
  const mainBg = isDark ? "bg-[#0F172A]" : "bg-[#F8FAFC]";
  const topbarBg = isDark ? "bg-[#1E293B]" : "bg-white";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-600";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <div className={cn("min-h-dvh font-sans", mainBg)}>
      <div className="mx-auto grid min-h-dvh max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className={cn("hidden border-r p-3 lg:block", isDark ? "bg-[#0F172A]" : "bg-[#F8FAFC]")}>
<div className="sticky top-3 h-[calc(100dvh-1.5rem)] overflow-auto pr-1 scrollbar-thin">
            <SidebarContent route={route} onRouteChange={onRouteChange} onLogout={onLogout} />
          </div>
        </aside>

        <main className="min-w-0 p-4 lg:p-5">
          {/* Topbar */}
          <div className={cn("rounded-2xl p-4 shadow-sm border", topbarBg, isDark ? "border-slate-700/50" : "border-slate-200", textPrimary)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                {/* Mobile menu */}
                <div className="lg:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="secondary"
                        className={cn("rounded-xl", isDark ? "bg-[#334155] hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200", textPrimary)}
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className={cn("w-[300px] p-0", isDark ? "bg-[#0F172A]" : "bg-[#F8FAFC]")}
                    >
<div className="h-full overflow-auto p-3 pr-1 scrollbar-thin">
                        <SidebarContent route={route} onRouteChange={onRouteChange} onLogout={onLogout} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="min-w-0">
                  <div className="text-base font-bold">{title}</div>
                  <div className={cn("mt-0.5 text-xs font-medium", textMuted)}>
                    {subtitle ?? "Monitoring status mesin via MQTT → server → DB"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                {/* MQTT Badge dihapus sesuai permintaan */}

                <span className={cn("text-xs font-medium", textMuted)}>
                  {lastUpdateText ?? "Last update: -"}
                </span>

                <Separator orientation="vertical" className={cn("hidden h-5 lg:block", isDark ? "bg-slate-700" : "bg-slate-200")} />

                <div className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-1.5",
                  isDark ? "border-slate-700 bg-[#1E293B]" : "border-slate-200 bg-white"
                )}>
                  <Switch checked={notifEnabled} onCheckedChange={onNotifToggle} />
                  <span className={cn("text-xs font-semibold", textSecondary)}>Notifikasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Machine Stats Cards - Visible on all pages */}
          <div className="mt-5">
            <DashboardKpis />
          </div>

          {/* Page Content */}
          <div className="mt-5 min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

