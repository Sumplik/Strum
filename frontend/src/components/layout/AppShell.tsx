import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Moon, Sun, LayoutDashboard, Wrench, BarChart3, TrendingUp, Menu, LogOut, Settings } from "lucide-react";
import { useTheme } from "@/app/theme";
import type { DashboardRoute } from "@/app/router";
import { DashboardKpis } from "@/features/dashboard/components/DashboardKpis";
import LogoLightMode from "@/components/Logo/emblem_lightmode.png";
import LogoDarkMode from "@/components/Logo/emblem_darkmode.png";

type Props = {
  route: DashboardRoute;
  onRouteChange: (r: DashboardRoute) => void;

  title: string;
  subtitle?: string;

  mqttLabel?: string;
  lastUpdateText?: string;

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
  { key: "settings", label: "Pengaturan", icon: <Settings className="h-4 w-4" /> },
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
  
  // Theme-aware colors using CSS variables
  const sidebarBg = isDark ? "bg-[var(--sidebar)]" : "bg-[#87CEEB]";
  const cardBg = isDark ? "bg-[var(--card)]" : "bg-white";
  const cardBorder = isDark ? "border-[var(--sidebar-border)]" : "border-transparent";
  const textPrimary = isDark ? "text-[var(--sidebar-foreground)]" : "text-[#1A2B49]";
  const textSecondary = isDark ? "text-[var(--muted-foreground)]" : "text-slate-500";
  const textMuted = isDark ? "text-[var(--muted-foreground)]" : "text-slate-400";
  const navItemBg = isDark ? "bg-[var(--sidebar-accent)]/50" : "bg-white/15";
  const navItemBorder = isDark ? "border-[var(--sidebar-border)]" : "border-white/20";
  const navItemHoverBg = isDark ? "hover:bg-[var(--sidebar-accent)]" : "hover:bg-white/25";
  const navItemHoverBorder = isDark ? "hover:border-[var(--sidebar-border)]" : "hover:border-white/30";
  const iconBg = isDark ? "bg-[var(--sidebar-accent)]" : "bg-white/10";
  const iconBorder = isDark ? "border-[var(--sidebar-border)]" : "border-white/20";
  const accentColor = isDark ? "text-blue-300" : "text-white";
  const accentBg = isDark ? "bg-blue-500/20" : "bg-white/25";
  const accentBorder = isDark ? "border-blue-500/40" : "border-white/30";
  
  return (
    <div className={cn("flex h-full flex-col gap-3", sidebarBg)}>
      {/* Logo Header */}
      <div className={cn("rounded-2xl border p-3 mb-2", cardBorder, cardBg)}>
        <div className="flex items-center gap-3">
          <img 
            src={isDark ? LogoDarkMode : LogoLightMode} 
            alt="STRUM Emblem" 
            className="h-10 w-auto object-contain"
          />
          <div className={textPrimary}>
            <div className="text-sm font-bold leading-tight">Strum</div>
            <div className={cn("text-[10px] font-medium mt-0.5", textMuted)}>Sistem Tracking Real-Time Utilitas Mesin</div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-1">
        {navItems.map((it) => {
          const active = it.key === route;
          const activeTextColor = isDark ? "text-white" : "text-[#1A2B49]";
          const inactiveTextColor = isDark ? "text-white/80" : "text-[#1A2B49]/80";
          
          return (
            <button
              key={it.key}
              onClick={() => onRouteChange(it.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200",
                "hover:scale-[1.01] active:scale-[0.99]",
                active
                  ? cn("border-white/30", accentBg, activeTextColor, "font-medium")
                  : cn(navItemBorder, navItemBg, inactiveTextColor, navItemHoverBg, navItemHoverBorder),
              )}
            >
              <span className={cn(
                "grid h-7 w-7 place-items-center rounded-lg border",
                active 
                  ? cn(accentBorder, accentBg, isDark ? "text-white" : "text-[#1A2B49]")
                  : cn(iconBorder, iconBg, isDark ? "text-white/80" : "text-[#1A2B49]/80")
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

      {/* Animated Sun and Clouds - Light mode only, above theme toggle */}
      {!isDark && (
        <div className="relative overflow-hidden h-16 -mx-1 px-1 pointer-events-none">
          {/* Sun */}
          <svg 
            className="absolute top-1 right-8 w-10 h-10 animate-sun-float"
            viewBox="0 0 64 64" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="12" fill="#FFD700" />
            <g className="animate-sun-rays">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1="32" y1="16" x2="32" y2="10"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${angle} 32 32)`}
                />
              ))}
            </g>
          </svg>
          
          {/* Cloud - Small */}
          <svg 
            className="absolute top-3 left-2 w-8 h-5 animate-cloud-drift opacity-70"
            viewBox="0 0 32 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="10" cy="11" rx="5" ry="4" fill="white" fillOpacity="0.8"/>
            <ellipse cx="19" cy="10" rx="7" ry="5" fill="white" fillOpacity="0.9"/>
            <ellipse cx="26" cy="12" rx="4" ry="3" fill="white" fillOpacity="0.7"/>
          </svg>
        </div>
      )}

      {/* Animated Moon, Stars, and Night Clouds - Dark mode only, above theme toggle */}
      {isDark && (
        <div className="relative overflow-hidden h-16 -mx-1 px-1 pointer-events-none">
          {/* Crescent Moon - Proper crescent shape using SVG path */}
          <svg 
            className="absolute top-1 right-7 w-11 h-11 animate-moon-float"
            viewBox="0 0 64 64" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer glow */}
            <circle cx="32" cy="32" r="22" fill="#F5F5DC" fillOpacity="0.08" />
            <circle cx="32" cy="32" r="18" fill="#F5F5DC" fillOpacity="0.12" />
            
            {/* True Crescent Moon - Created using arc path */}
            <path 
              d="M38 10 
                 A 20 20 0 1 1 38 54 
                 A 16 16 0 1 0 38 10Z" 
              fill="#F5F5DC"
            />
            
            {/* Subtle crater details for realism */}
            <circle cx="30" cy="22" r="2" fill="#E8E8D0" fillOpacity="0.4" />
            <circle cx="36" cy="32" r="1.5" fill="#E8E8D0" fillOpacity="0.3" />
            <circle cx="32" cy="40" r="1" fill="#E8E8D0" fillOpacity="0.25" />
          </svg>
          
          {/* Four-pointed Star - Large, top left with sparkle */}
          <svg 
            className="absolute top-2 left-3 w-7 h-7 animate-star-sparkle"
            viewBox="0 0 24 24" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '0s' }}
          >
            {/* Horizontal line */}
            <path d="M2 12H22" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Vertical line */}
            <path d="M12 2L12 22" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Diagonal lines */}
            <path d="M4.93 4.93L19.07 19.07" stroke="#FFD700" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M4.93 19.07L19.07 4.93" stroke="#FFD700" strokeWidth="1.2" strokeLinecap="round"/>
            {/* Center glow */}
            <circle cx="12" cy="12" r="3" fill="#FFD700" fillOpacity="0.6"/>
          </svg>
          
          {/* Diamond Star - Medium with sparkle */}
          <svg 
            className="absolute top-3 left-12 w-4 h-4 animate-star-sparkle"
            viewBox="0 0 16 16" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '0.8s' }}
          >
            <path d="M8 1L10 6L15 8L10 10L8 15L6 10L1 8L6 6L8 1Z" fill="#E0E7FF"/>
          </svg>
          
          {/* Small round star - pulse animation */}
          <svg 
            className="absolute top-8 right-4 w-3 h-3 animate-star-pulse"
            viewBox="0 0 12 12" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '0s' }}
          >
            <circle cx="6" cy="6" r="2.5" fill="#BFDBFE"/>
          </svg>
          
          {/* Tiny sparkle star */}
          <svg 
            className="absolute top-5 right-16 w-2.5 h-2.5 animate-star-sparkle"
            viewBox="0 0 10 10" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '1.2s' }}
          >
            <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4L5 0Z" fill="#FDE68A"/>
          </svg>
          
          {/* Extra small twinkle star */}
          <svg 
            className="absolute top-6 left-20 w-2 h-2 animate-star-twinkle"
            viewBox="0 0 8 8" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '1.8s' }}
          >
            <circle cx="4" cy="4" r="1.5" fill="#FCD34D"/>
          </svg>
          
          {/* Night Cloud - Dark with subtle drift */}
          <svg 
            className="absolute top-10 left-1/3 w-12 h-6 animate-night-cloud-drift opacity-25"
            viewBox="0 0 48 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '1s' }}
          >
            <ellipse cx="14" cy="13" rx="8" ry="5" fill="#1E293B"/>
            <ellipse cx="26" cy="12" rx="10" ry="6" fill="#1E293B" fillOpacity="0.9"/>
            <ellipse cx="36" cy="14" rx="7" ry="4" fill="#1E293B" fillOpacity="0.8"/>
          </svg>
          
          {/* Second smaller night cloud */}
          <svg 
            className="absolute top-11 right-10 w-8 h-4 animate-night-cloud-drift opacity-20"
            viewBox="0 0 32 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: '2.5s' }}
          >
            <ellipse cx="10" cy="9" rx="5" ry="3" fill="#334155"/>
            <ellipse cx="18" cy="8" rx="6" ry="4" fill="#334155" fillOpacity="0.9"/>
            <ellipse cx="25" cy="10" rx="4" ry="2.5" fill="#334155" fillOpacity="0.8"/>
          </svg>
        </div>
      )}

      {/* Theme Toggle - Same style as nav items, above logout */}
      <button
        onClick={toggleTheme}
        className={cn(
          "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200",
          "hover:scale-[1.01] active:scale-[0.99]",
          navItemBorder, navItemBg, isDark ? "text-white/80" : "text-[#1A2B49]/80", navItemHoverBg, navItemHoverBorder,
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg border", iconBorder, iconBg, isDark ? "text-white/80" : "text-[#1A2B49]/80")}>
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
  const { theme, isTransitioning } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  
  const {
    route,
    onRouteChange,
    title,
    subtitle,
    mqttLabel,
    lastUpdateText,
    onLogout,
    children,
  } = props;

  const isDark = theme === "dark";
  
  // Theme-aware colors using CSS variables
  const mainBg = isDark ? "bg-[var(--background)]" : "bg-white";
  const topbarBg = isDark ? "bg-[var(--card)]" : "bg-[#87CEEB] shadow-[0_4px_6px_-1px_rgba(59,130,246,0.1)]";
  const textPrimary = isDark ? "text-[var(--foreground)]" : "text-black";
  const textSecondary = isDark ? "text-[var(--muted-foreground)]" : "text-slate-700";
  const textMuted = isDark ? "text-[var(--muted-foreground)]" : "text-slate-600";

  return (
    <div className={cn("min-h-dvh font-sans", mainBg, "theme-transition")}>
      <div className={cn(
        "mx-auto grid min-h-dvh transition-all duration-300",
        sidebarOpen ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[0px_1fr]"
      )}>
        {/* Desktop sidebar - Sky Blue for light mode */}
        <aside className={cn(
          "hidden border-r p-3 lg:block transition-all duration-300 overflow-hidden sticky top-0 h-dvh",
          isDark ? "bg-[var(--sidebar)]" : "bg-[#87CEEB]",
          sidebarOpen ? "w-[260px] opacity-100" : "w-0 opacity-0"
        )}>
          <div className="h-full overflow-hidden">
            <SidebarContent route={route} onRouteChange={onRouteChange} onLogout={onLogout} />
          </div>
        </aside>

        <main className="min-w-0 p-2 sm:p-4 lg:p-5">
          {/* Topbar */}
          <div className={cn("rounded-2xl p-2 sm:p-4 shadow-sm border", topbarBg, isDark ? "border-slate-700/50" : "border-slate-200", textPrimary)}>
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Section: Menu + Title */}
              <div className="flex items-start gap-2 sm:gap-3">
                {/* Mobile menu */}
                <div className="lg:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className={cn("rounded-xl shrink-0", isDark ? "bg-[#334155] hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200", textPrimary)}
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className={cn("w-[300px] p-0", isDark ? "bg-[var(--sidebar)]" : "bg-[#1E293B]")}
                    >
                      <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                      <SheetDescription className="sr-only">Navigasi menu untuk dashboard monitoring mesin</SheetDescription>
                      <div className="h-full overflow-auto p-3 pr-1 scrollbar-thin">
                        <SidebarContent route={route} onRouteChange={onRouteChange} onLogout={onLogout} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Sidebar toggle - desktop only */}
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={cn(
                    "hidden lg:flex rounded-xl shrink-0",
                    isDark ? "bg-[#334155] hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200",
                    textPrimary
                  )}
                >
                  {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-bold truncate">{title}</div>
                  <div className={cn("mt-0.5 text-[10px] sm:text-xs font-medium hidden xs:block", textMuted)}>
                    {subtitle ?? "Monitoring via MQTT → server → DB"}
                  </div>
                </div>
              </div>

              {/* Right Section: Last Update */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 lg:justify-end">
                {/* Last Update - responsive visibility */}
                <span className={cn("text-[10px] sm:text-xs font-medium", textMuted)}>
                  {lastUpdateText ?? "Last update: -"}
                </span>
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

