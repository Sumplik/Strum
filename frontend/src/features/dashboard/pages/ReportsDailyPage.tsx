import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { api, type DailySummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Device } from "@/types/device";
import { DatePicker } from "@/components/ui/date-picker";

// Helper to format hours (decimal to "Xj Ym")
function formatHours(hoursStr: string): string {
  const hours = parseFloat(hoursStr);
  if (isNaN(hours) || hours === 0) return "0j 0m";
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}j ${m}m`;
}

// Helper to format date for API (YYYY-MM-DD)
function formatApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface SummaryRow {
  device_id: string;
  name: string;
  summary: {
    idle_hours: string;
    onduty_hours: string;
    on_total_hours: string;
    off_hours: string;
    availability_percent: string;
  };
}

export default function ReportsDailyPage() {
  // Default to today's date
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [tanggal, setTanggal] = useState(() => formatApiDate(today));

  // Handle date selection from DatePicker
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setTanggal(formatApiDate(date));
    }
  };

  // Fetch devices list for device names
  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.getDevices(),
  });

  // Fetch daily summary from backend
  const summaryQuery = useQuery({
    queryKey: ["daily-summary", tanggal],
    queryFn: () => api.getDailySummary(tanggal),
  });

  // Combine device info with summary data from API
  const summaryData: SummaryRow[] = (() => {
    if (!summaryQuery.data?.success || !devicesQuery.data?.success) {
      return [];
    }

    const devices = devicesQuery.data.data;
    const summaries = summaryQuery.data.data;

    return summaries.map((item: DailySummary) => {
      const device = devices.find((d: Device) => d.id === item.device_id);
      return {
        device_id: item.device_id,
        name: device?.id || item.device_id,
        summary: item.summary,
      };
    });
  })();

  const isLoading = devicesQuery.isLoading || summaryQuery.isLoading;
  const isRefreshing = summaryQuery.isFetching;

  // Calculate average availability
  const avgAvailability = summaryData.length > 0
    ? (summaryData.reduce((acc, d) => acc + parseFloat(d.summary.availability_percent), 0) / summaryData.length).toFixed(1)
    : "0.0";

  const handleRefresh = () => {
    summaryQuery.refetch();
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
      {/* Header Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Summary Harian (Availability)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Tanggal Input with DatePicker - Left Side */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tanggal</span>
              <DatePicker
                date={selectedDate}
                onSelect={handleDateSelect}
                placeholder="Pilih tanggal"
              />
            </div>

            {/* Avg Availability + Refresh Button - Right Side */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                <span className="text-sm text-muted-foreground">Avg Availability:</span>
                <span className="text-lg font-bold">{avgAvailability}%</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Mesin</TableHead>
                <TableHead className="text-right">ON</TableHead>
                <TableHead className="text-right">Idle</TableHead>
                <TableHead className="text-right">On Duty</TableHead>
                <TableHead className="text-right">OFF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((item) => (
                  <TableRow key={item.device_id}>
                    <TableCell className="font-medium">
                      <div>
                        <span className="font-bold">{item.device_id}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          {item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(item.summary.on_total_hours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(item.summary.idle_hours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(item.summary.onduty_hours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(item.summary.off_hours)}
                    </TableCell>
                  </TableRow>
                ))}
              {summaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No data available for this date
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

