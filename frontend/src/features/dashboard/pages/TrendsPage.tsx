import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Download } from "lucide-react";
import { api } from "@/lib/api";
import { averagePercent, cn, formatApiDate, formatHours } from "@/lib/utils";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import type { DeviceSummary, DeviceSummaryRow } from "@/types/api";
import { DateRangePicker, MonthYearPicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

type Period = "mingguan" | "bulanan";

const MAX_WEEKLY_RANGE_DAYS = 30;
const MAX_MONTHLY_RANGE_MONTHS = 12;

interface SummaryRow {
  device_id: string;
  name: string;
  summary: DeviceSummary;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

const firstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const lastDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

function availabilityColor(value: number): string {
  if (value >= 90) return "text-green-600";
  if (value >= 70) return "text-yellow-600";
  return "text-red-600";
}

function dedupeByDevice(rows: DeviceSummaryRow[]): DeviceSummaryRow[] {
  const seen = new Map<string, DeviceSummaryRow>();
  for (const row of rows) {
    const key = row.device_id.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, row);
  }
  return Array.from(seen.values());
}

export default function TrendsPage() {
  const [period, setPeriod] = useState<Period>("bulanan");

  const [weekRange, setWeekRange] = useState<{ from?: Date; to?: Date }>(() => ({
    from: daysAgo(7),
    to: new Date(),
  }));
  const [monthRange, setMonthRange] = useState<{ from?: Date; to?: Date }>(() => ({
    from: monthsAgo(3),
    to: new Date(),
  }));

  const [range, setRange] = useState(() => ({
    start: formatApiDate(firstDayOfMonth(monthsAgo(3))),
    end: formatApiDate(new Date()),
  }));

  const handleDateRangeSelect = (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return;

    const diffDays = Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_WEEKLY_RANGE_DAYS) {
      toast.error(`Maksimal range untuk Mingguan adalah ${MAX_WEEKLY_RANGE_DAYS} hari`);
      return;
    }
    if (to < from) {
      toast.error("Tanggal akhir harus >= tanggal awal");
      return;
    }

    setWeekRange({ from, to });
    setRange({ start: formatApiDate(from), end: formatApiDate(to) });
  };

  const handleMonthRangeSelect = (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return;

    const diffMonths = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    if (diffMonths >= MAX_MONTHLY_RANGE_MONTHS) {
      toast.error(`Maksimal range untuk Bulanan adalah ${MAX_MONTHLY_RANGE_MONTHS} bulan`);
      return;
    }
    if (to < from) {
      toast.error("Bulan akhir harus >= bulan awal");
      return;
    }

    setMonthRange({ from, to });
    setRange({ start: formatApiDate(firstDayOfMonth(from)), end: formatApiDate(lastDayOfMonth(to)) });
  };

  const handlePeriodChange = (value: string) => {
    const next = value as Period;
    setPeriod(next);

    const today = new Date();
    if (next === "mingguan") {
      const weekAgo = daysAgo(7);
      setWeekRange({ from: weekAgo, to: today });
      setRange({ start: formatApiDate(weekAgo), end: formatApiDate(today) });
    } else {
      const monthAgo = monthsAgo(3);
      setMonthRange({ from: monthAgo, to: today });
      setRange({ start: formatApiDate(firstDayOfMonth(monthAgo)), end: formatApiDate(today) });
    }
  };

  const devicesQuery = useDevices();
  const summaryQuery = useQuery({
    queryKey: ["summary", period, range.start, range.end],
    queryFn: () => api.getRangeSummary(range.start, range.end),
  });

  const devices = devicesQuery.data?.success ? devicesQuery.data.data : [];
  const rows: SummaryRow[] =
    summaryQuery.data?.success && devicesQuery.data?.success
      ? dedupeByDevice(summaryQuery.data.data).map((item) => ({
          device_id: item.device_id,
          name: devices.find((d) => d.id === item.device_id)?.location || item.current?.location || "-",
          summary: item.summary,
        }))
      : [];

  const isLoading = devicesQuery.isLoading || summaryQuery.isLoading;
  const isRefreshing = summaryQuery.isFetching;
  const avgAvailability = averagePercent(rows.map((r) => r.summary.availability_percent));

  const handleDownloadJson = async () => {
    try {
      await api.downloadLogs("json", range.start, range.end);
      toast.success("Download JSON berhasil");
    } catch {
      toast.error("Download gagal");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[120px] rounded-2xl" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Trend Mingguan / Bulanan</CardTitle>
          <p className="text-sm text-muted-foreground">Trend availability dari event log.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Tabs value={period} onValueChange={handlePeriodChange}>
                <TabsList>
                  <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                  <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                </TabsList>
              </Tabs>

              {period === "mingguan" ? (
                <DateRangePicker
                  from={weekRange.from}
                  to={weekRange.to}
                  onSelect={handleDateRangeSelect}
                  fromPlaceholder="Dari"
                  toPlaceholder="Sampai"
                />
              ) : (
                <MonthYearPicker
                  fromMonth={monthRange.from}
                  toMonth={monthRange.to}
                  onSelect={handleMonthRangeSelect}
                  fromPlaceholder="Dari bulan"
                  toPlaceholder="Sampai bulan"
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                <span className="text-sm text-muted-foreground">Avg:</span>
                <span className="text-lg font-bold">{avgAvailability}%</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => summaryQuery.refetch()}
                disabled={isRefreshing}
                className="h-9 w-9 sm:w-auto"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>

              <Button size="sm" variant="ghost" onClick={handleDownloadJson}>
                <Download className="mr-1 h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-[var(--card)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mesin</TableHead>
                  <TableHead className="text-right">ON</TableHead>
                  <TableHead className="text-right">OFF</TableHead>
                  <TableHead className="text-right">Availability</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.device_id}>
                    <TableCell className="font-medium">
                      <span className="font-bold">{item.device_id}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{item.name}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatHours(item.summary.on_total_hours)}</TableCell>
                    <TableCell className="text-right">
                      {formatHours(item.summary.operational_off_hours)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-bold",
                          availabilityColor(parseFloat(item.summary.availability_percent)),
                        )}
                      >
                        {item.summary.availability_percent}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No data available for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
