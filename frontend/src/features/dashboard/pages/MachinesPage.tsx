import * as React from "react";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DeviceTable } from "@/features/dashboard/components/DeviceTable";
import DeviceDetailDialog from "@/features/dashboard/components/DeviceDetailDialog";
import type { Device } from "@/types/device";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "on_duty" | "idle" | "off";

export default function MachinesPage() {
  const q = useDevices();
  const [qText, setQText] = React.useState("");
  const [selected, setSelected] = React.useState<Device | null>(null);
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterType>("all");

  if (q.isLoading) return <Skeleton className="h-[500px] w-full rounded-2xl" />;

  if (!q.data || q.data.success === false) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        Gagal load devices. Pastikan backend hidup.
      </Alert>
    );
  }

  const devices = q.data.data;

  // Calculate stats for filter counts
  const stats = React.useMemo(() => {
    const onDuty = devices.filter((d) => d.status === "on_duty").length;
    const idle = devices.filter((d) => d.status === "idle").length;
    const off = devices.filter((d) => d.status === "off").length;
    return { onDuty, idle, off, total: devices.length };
  }, [devices]);

  // Filter by search text
  const filteredBySearch = devices.filter((d) => {
    if (!qText.trim()) return true;
    const s = qText.toLowerCase();
    return d.id.toLowerCase().includes(s) || (d.ipAddress ?? "").toLowerCase().includes(s);
  });

  // Filter by status tab
  const filtered = filteredBySearch.filter((d) => {
    if (filter === "all") return true;
    if (filter === "on_duty") return d.status === "on_duty";
    if (filter === "idle") return d.status === "idle";
    if (filter === "off") return d.status === "off";
    return true;
  });

  const filters: Array<{ value: FilterType; label: string; count: number; color: string }> = [
    { value: "all", label: "All", count: stats.total, color: "bg-slate-500" },
    { value: "on_duty", label: "On Duty", count: stats.onDuty, color: "bg-green-600" },
    { value: "idle", label: "Idle", count: stats.idle, color: "bg-blue-600" },
    { value: "off", label: "OFF", count: stats.off, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filter Card */}
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Title - Left Side */}
            <div>
              <div className="text-base font-extrabold">Daftar Mesin</div>
              <div className="text-xs text-muted-foreground">Search by ID / IP address.</div>
            </div>

            {/* Action Area - Right Side */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              {/* Filter Tabs with Color Dots - Scrollable on mobile */}
              <div className="overflow-x-auto -mx-2 px-2 sm:overflow-visible sm:mx-0 sm:px-0">
              <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700 p-1 min-w-max">
                {filters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                      filter === f.value
                        ? "bg-slate-400 dark:bg-slate-600 shadow-sm text-white font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", f.color)}></span>
                    <span>{f.label}</span>
                    <span className="text-xs opacity-70">({f.count})</span>
                  </button>
                ))}
              </div>
              </div>

              {/* Search Input with Icon */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Cari ID / IP..."
                  className="rounded-xl pl-9 pr-8"
                />
                {qText && (
                  <button
                    onClick={() => setQText("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Table */}
      <DeviceTable
        devices={filtered}
        onSelect={(d) => {
          setSelected(d);
          setOpen(true);
        }}
      />

      <DeviceDetailDialog open={open} onOpenChange={setOpen} device={selected} />
    </div>
  );
}

