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
  const cls =
    accent === "onframe"
      ? "bg-blue-500"
      : accent === "onduty"
        ? "bg-amber-500"
        : accent === "off"
          ? "bg-red-500"
          : "bg-slate-400/70";

  return <span className={cn("h-2.5 w-2.5 rounded-full", cls)} />;
}

function AccentRing({ accent }: { accent: Accent }) {
  // ring halus (bukan neon)
  const cls =
    accent === "onframe"
      ? "ring-blue-500/25"
      : accent === "onduty"
        ? "ring-amber-500/25"
        : accent === "off"
          ? "ring-red-500/25"
          : "ring-slate-500/10";

  return cls;
}

export function KpiCard({ title, value, hint, accent = "default", right }: Props) {
  return (
    <Card
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm",
        "transition hover:shadow-md",
        "ring-1",
        AccentRing({ accent }),
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AccentDot accent={accent} />
              <div className="text-xs font-medium text-muted-foreground">{title}</div>
            </div>

            <div className="mt-3 text-3xl font-black tracking-tight">{value}</div>

            {hint ? (
              <div className="mt-3 text-xs text-muted-foreground">{hint}</div>
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
  const dotCls =
    dot === "blue"
      ? "bg-blue-500"
      : dot === "green"
        ? "bg-emerald-500"
        : dot === "amber"
          ? "bg-amber-500"
          : dot === "red"
            ? "bg-red-500"
            : "bg-slate-400/70";

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
      <span className="text-muted-foreground">{label}:</span>
      <b className="text-foreground">{value}</b>
    </span>
  );
}