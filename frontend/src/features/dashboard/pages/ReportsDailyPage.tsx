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
  // Current metadata from device (latest info)
  location?: string | null;
  threshold?: number | null;
  summary: {
    idle_hours: string;
    onduty_hours: string;
    on_total_hours: string;
    off_hours: string;
    // Operational hours breakdown
    operational_on_hours: string;
    operational_off_hours: string;
    operational_idle_hours: string;
    total_operational_hours: string;
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
  // Use current metadata from API response (which reflects latest device info)
  const summaryData: SummaryRow[] = (() => {
    if (!summaryQuery.data?.success || !devicesQuery.data?.success) {
      return [];
    }

    const devices = devicesQuery.data.data;
    const summaries = summaryQuery.data.data;

    return summaries.map((item: DailySummary) => {
      const device = devices.find((d: Device) => d.id === item.device_id);
      // Prioritize current metadata from API (latest info), fallback to device data
      const currentLocation = item.current?.location ?? device?.location ?? null;
      const currentThreshold = item.current?.threshold ?? device?.thresholdDuty ?? null;
      
      return {
        device_id: item.device_id,
        name: device?.id || item.device_id,
        location: currentLocation,
        threshold: currentThreshold,
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
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-[100px] sm:h-[120px] rounded-2xl" />
        <Skeleton className="h-[300px] sm:h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header Section */}
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-base sm:text-lg font-semibold">Summary Harian (Availability)</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Laporan ketersediaan mesin harian berdasarkan data operasional</p>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Filter Section - Horizontal Layout */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Tanggal Filter */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Tanggal:</span>
                <DatePicker
                  date={selectedDate}
                  onSelect={handleDateSelect}
                  placeholder="Pilih"
                  className="w-[130px] sm:w-auto"
                />
              </div>
            </div>

            {/* Right: Avg Availability + Refresh Button */}
            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-2 sm:px-3 py-1.5">
                <span className="text-xs sm:text-sm text-muted-foreground">Avg:</span>
                <span className="text-base sm:text-lg font-bold">{avgAvailability}%</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px] sm:w-[250px]">Mesin</TableHead>
                <TableHead className="hidden sm:table-cell">Lokasi</TableHead>
                <TableHead className="text-right">ON</TableHead>
                <TableHead className="text-right hidden md:table-cell">Idle</TableHead>
                <TableHead className="text-right hidden lg:table-cell">On Duty</TableHead>
                <TableHead className="text-right">OFF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((item) => (
                  <TableRow key={item.device_id}>
                    <TableCell className="font-medium">
                      <div>
                        <span className="font-bold text-sm">{item.device_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {item.location ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatHours(item.summary.on_total_hours)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell">
                      {formatHours(item.summary.idle_hours)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell">
                      {formatHours(item.summary.onduty_hours)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatHours(item.summary.operational_off_hours)}
                    </TableCell>
                  </TableRow>
                ))}
              {summaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No data available for this date
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