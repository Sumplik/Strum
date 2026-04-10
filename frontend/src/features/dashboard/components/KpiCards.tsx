
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Accent = "default" | "onframe" | "onduty" | "off";

type Props = {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: Accent;
  right?: React.ReactNode; // opsional kalau mau icon kecil kanan atas
};

function AccentDot({ accent }: { accent: Accent }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const cls =
    accent === "onframe"
      ? "bg-blue-500 dark:bg-blue-400"
      : accent === "onduty"
        ? "bg-green-500 dark:bg-green-400"
        : accent === "off"
          ? "bg-red-500 dark:bg-red-400"
          : isDark ? "bg-slate-500" : "bg-slate-400/70";

  return <span className={cn("h-2.5 w-2.5 rounded-full", cls)} />;
}

function AccentHeader({ accent }: { accent: Accent }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  // Header accent line (4px at top) with status color
  const cls =
    accent === "onframe"
      ? isDark ? "bg-gradient-to-r from-blue-400 to-blue-500" : "bg-gradient-to-r from-blue-500 to-blue-600"
      : accent === "onduty"
        ? isDark ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gradient-to-r from-green-500 to-green-600"
        : accent === "off"
          ? isDark ? "bg-gradient-to-r from-red-400 to-rose-500" : "bg-gradient-to-r from-red-500 to-rose-600"
          : isDark ? "bg-gradient-to-r from-slate-500 to-slate-600" : "bg-gradient-to-r from-slate-400 to-slate-500";

  return <div className={cn("h-1 w-12 rounded-full", cls)} />;
}

function AccentRing({ accent }: { accent: Accent }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  // Soft ring instead of harsh border - theme-aware
  const cls = accent === "onframe"
    ? isDark ? "ring-blue-500/30 shadow-blue-500/5" : "ring-blue-500/20 shadow-blue-500/5"
    : accent === "onduty"
      ? isDark ? "ring-green-500/30 shadow-green-500/5" : "ring-green-500/20 shadow-green-500/5"
      : accent === "off"
        ? isDark ? "ring-red-500/30 shadow-red-500/5" : "ring-red-500/20 shadow-red-500/5"
        : isDark ? "ring-slate-600 shadow-slate-500/5" : "ring-slate-200 shadow-slate-100";

  return cls;
}

function IconBg({ accent }: { accent: Accent }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  const cls = accent === "onframe"
    ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"
    : accent === "onduty"
      ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"
      : accent === "off"
        ? isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600"
        : isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600";

  return cls;
}

export function KpiCard({ title, value, hint, accent = "default", right }: Props) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-[var(--card)]",
        "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]",
        "transition-all duration-200 hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
        "hover:-translate-y-0.5",
        "ring-1",
        AccentRing({ accent }),
      )}
    >
      {/* Header Accent Line */}
      <div className="absolute left-0 top-0 right-0 h-1">
        <AccentHeader accent={accent} />
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AccentDot accent={accent} />
              <div className="text-xs font-medium text-muted-foreground">{title}</div>
            </div>

            <div className="mt-4 text-4xl font-black tracking-tight">{value}</div>

            {hint ? (
              <div className="mt-4 text-xs text-muted-foreground">{hint}</div>
            ) : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** mini pill seperti di blueprint: "Idle: 9" / "On Duty: 9" / dll */
export function KpiPill({
  dot,
  label,
  value,
  tone = "neutral",
}: {
  dot?: "blue" | "green" | "amber" | "red" | "neutral";
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "primary";
}) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  const dotCls =
    dot === "blue"
      ? isDark ? "bg-blue-400" : "bg-blue-500"
      : dot === "green"
        ? isDark ? "bg-green-400" : "bg-green-500"
        : dot === "amber"
          ? isDark ? "bg-amber-400" : "bg-amber-500"
          : dot === "red"
            ? isDark ? "bg-red-400" : "bg-red-500"
            : isDark ? "bg-slate-400" : "bg-slate-400/70";

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
      <span className={cn("h-2 w-2 rounded-full", dotCls)} />
      <span className={isDark ? "text-slate-300" : "text-slate-500"}>{label}:</span>
      <b className="text-foreground">{value}</b>
    </span>
  );
}
