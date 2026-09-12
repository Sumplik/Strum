import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/app/useTheme";

type Accent = "default" | "onframe" | "onduty" | "off";

type Props = {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: Accent;
  right?: React.ReactNode;
};

type ThemedClasses = { light: string; dark: string };

const ACCENT_STYLES: Record<Accent, { dot: ThemedClasses; header: ThemedClasses; ring: ThemedClasses }> = {
  onframe: {
    dot: { light: "bg-blue-500", dark: "bg-blue-400" },
    header: {
      light: "bg-gradient-to-r from-blue-500 to-blue-600",
      dark: "bg-gradient-to-r from-blue-400 to-blue-500",
    },
    ring: { light: "ring-blue-500/20 shadow-blue-500/5", dark: "ring-blue-500/30 shadow-blue-500/5" },
  },
  onduty: {
    dot: { light: "bg-green-500", dark: "bg-green-400" },
    header: {
      light: "bg-gradient-to-r from-green-500 to-green-600",
      dark: "bg-gradient-to-r from-green-400 to-green-500",
    },
    ring: { light: "ring-green-500/20 shadow-green-500/5", dark: "ring-green-500/30 shadow-green-500/5" },
  },
  off: {
    dot: { light: "bg-red-500", dark: "bg-red-400" },
    header: {
      light: "bg-gradient-to-r from-red-500 to-rose-600",
      dark: "bg-gradient-to-r from-red-400 to-rose-500",
    },
    ring: { light: "ring-red-500/20 shadow-red-500/5", dark: "ring-red-500/30 shadow-red-500/5" },
  },
  default: {
    dot: { light: "bg-slate-400/70", dark: "bg-slate-500" },
    header: {
      light: "bg-gradient-to-r from-slate-400 to-slate-500",
      dark: "bg-gradient-to-r from-slate-500 to-slate-600",
    },
    ring: { light: "ring-slate-200 shadow-slate-100", dark: "ring-slate-600 shadow-slate-500/5" },
  },
};

const PILL_DOT_STYLES: Record<NonNullable<KpiPillProps["dot"]>, ThemedClasses> = {
  blue: { light: "bg-blue-500", dark: "bg-blue-400" },
  green: { light: "bg-green-500", dark: "bg-green-400" },
  amber: { light: "bg-amber-500", dark: "bg-amber-400" },
  red: { light: "bg-red-500", dark: "bg-red-400" },
  neutral: { light: "bg-slate-400/70", dark: "bg-slate-400" },
};

export function KpiCard({ title, value, hint, accent = "default", right }: Props) {
  const { theme } = useTheme();
  const styles = ACCENT_STYLES[accent];

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-[var(--card)]",
        "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]",
        "transition-all duration-200 hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
        "hover:-translate-y-0.5",
        "ring-1",
        styles.ring[theme],
      )}
    >
      <div className="absolute left-0 top-0 right-0 h-1">
        <div className={cn("h-1 w-12 rounded-full", styles.header[theme])} />
      </div>

      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", styles.dot[theme])} />
              <div className="text-xs font-medium text-muted-foreground">{title}</div>
            </div>

            <div className="mt-4 text-4xl font-black tracking-tight">{value}</div>

            {hint ? <div className="mt-4 text-xs text-muted-foreground">{hint}</div> : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

type KpiPillProps = {
  dot?: "blue" | "green" | "amber" | "red" | "neutral";
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "primary";
};

export function KpiPill({ dot = "neutral", label, value, tone = "neutral" }: KpiPillProps) {
  const { theme } = useTheme();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        "bg-background/60 backdrop-blur",
        "text-foreground/80",
        "dark:bg-background/20",
        tone === "primary" && "border-blue-500/30",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", PILL_DOT_STYLES[dot][theme])} />
      <span className={theme === "dark" ? "text-slate-300" : "text-slate-500"}>{label}:</span>
      <b className="text-foreground">{value}</b>
    </span>
  );
}
