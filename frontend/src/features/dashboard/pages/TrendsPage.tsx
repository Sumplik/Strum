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
import { RefreshCw } from "lucide-react";
import { api, type DailySummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Device } from "@/types/device";
import { DateRangePicker } from "@/components/ui/date-picker";

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

export default function TrendsPage() {
  // Default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [tabValue, setTabValue] = useState("bulanan");
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(thirtyDaysAgo);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(today);
  const [startDate, setStartDate] = useState(() => formatApiDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(() => formatApiDate(today));

  // Handle date range selection
  const handleDateRangeSelect = (from: Date | undefined, to: Date | undefined) => {
    setSelectedStartDate(from);
    setSelectedEndDate(to);
    if (from) {
      setStartDate(formatApiDate(from));
    }
    if (to) {
      setEndDate(formatApiDate(to));
    }
  };

  // Fetch devices list
  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.getDevices(),
  });

  // Fetch summary data from API
  const summaryQuery = useQuery({
    queryKey: ["summary-range", startDate, endDate],
    queryFn: () => api.getRangeSummary(startDate, endDate),
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

  const handleTabChange = (value: string) => {
    setTabValue(value);
    const today = new Date();
    
    if (value === "mingguan") {
      // Last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      setStartDate(formatApiDate(weekAgo));
      setEndDate(formatApiDate(today));
      setSelectedStartDate(weekAgo);
      setSelectedEndDate(today);
    } else if (value === "bulanan") {
      // Last 30 days
      const monthAgo = new Date();
      monthAgo.setDate(today.getDate() - 30);
      setStartDate(formatApiDate(monthAgo));
      setEndDate(formatApiDate(today));
      setSelectedStartDate(monthAgo);
      setSelectedEndDate(today);
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
      {/* Header Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Trend Mingguan / Bulanan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Trend availability dari event log.
          </p>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={tabValue} onValueChange={handleTabChange} className="mb-4">
            <TabsList>
              <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
              <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date Inputs with DateRangePicker and Refresh */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range Picker */}
              <DateRangePicker
                from={selectedStartDate}
                to={selectedEndDate}
                onSelect={handleDateRangeSelect}
                fromPlaceholder="Dari"
                toPlaceholder="Sampai"
              />
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-fit"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Range Avg Availability */}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-4 py-2 w-fit">
            <span className="text-sm text-muted-foreground">Range Avg Availability:</span>
            <span className="text-lg font-bold">{avgAvailability}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card>
        <CardContent className="p-0">
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
              {summaryData.map((item) => {
                const availability = parseFloat(item.summary.availability_percent);
                return (
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
                      {formatHours(item.summary.off_hours)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-bold",
                          availability >= 90
                            ? "text-green-600"
                            : availability >= 70
                            ? "text-yellow-600"
                            : "text-red-600"
                        )}
                      >
                        {item.summary.availability_percent}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {summaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No data available for this period
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

