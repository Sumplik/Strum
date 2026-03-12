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
import { DateRangePicker, MonthYearPicker } from "@/components/ui/date-picker";

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
    operational_off_hours: string;
  };
}

export default function TrendsPage() {
  // Default values
  const today = new Date();
  
  // Default for weekly: last 7 days
  const defaultWeekStart = new Date();
  defaultWeekStart.setDate(today.getDate() - 7);
  
  // Default for monthly: last 3 months (go to same day 3 months ago)
  const defaultMonthStart = new Date();
  defaultMonthStart.setMonth(today.getMonth() - 3);

  const [tabValue, setTabValue] = useState("bulanan");
  
  // State for weekly (date range)
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(defaultWeekStart);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(today);
  const [startDate, setStartDate] = useState(() => formatApiDate(defaultWeekStart));
  const [endDate, setEndDate] = useState(() => formatApiDate(today));
  
  // State for monthly (month range)
  const [selectedFromMonth, setSelectedFromMonth] = useState<Date | undefined>(defaultMonthStart);
  const [selectedToMonth, setSelectedToMonth] = useState<Date | undefined>(today);

  // Handle weekly date range selection
  const handleDateRangeSelect = (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return;
    
    // Validate: max 30 days for weekly
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      alert("Maksimal range untuk Mingguan adalah 30 hari");
      return;
    }
    
    // Validate: to >= from
    if (to < from) {
      alert("Tanggal akhir harus >= tanggal awal");
      return;
    }
    
    setSelectedStartDate(from);
    setSelectedEndDate(to);
    setStartDate(formatApiDate(from));
    setEndDate(formatApiDate(to));
  };

  // Handle monthly month range selection
  const handleMonthRangeSelect = (fromMonth: Date | undefined, toMonth: Date | undefined) => {
    if (!fromMonth || !toMonth) return;
    
    // Validate: max 12 months
    const diffMonths = (toMonth.getFullYear() - fromMonth.getFullYear()) * 12 + (toMonth.getMonth() - fromMonth.getMonth());
    
    if (diffMonths > 11) { // 11 because 0-11 = 12 months
      alert("Maksimal range untuk Bulanan adalah 12 bulan");
      return;
    }
    
    // Validate: to >= from
    if (toMonth < fromMonth) {
      alert("Bulan akhir harus >= bulan awal");
      return;
    }
    
    setSelectedFromMonth(fromMonth);
    setSelectedToMonth(toMonth);
    
    // Convert to date range for API (first day of fromMonth to last day of toMonth)
    const fromDate = new Date(fromMonth.getFullYear(), fromMonth.getMonth(), 1);
    const toDate = new Date(toMonth.getFullYear(), toMonth.getMonth() + 1, 0); // Last day of toMonth
    
    setStartDate(formatApiDate(fromDate));
    setEndDate(formatApiDate(toDate));
  };

  // Fetch devices list
  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.getDevices(),
  });

  // Fetch summary data from API based on date range (from DateRangePicker)
  const summaryQuery = useQuery({
    queryKey: ["summary", tabValue, startDate, endDate],
    queryFn: async () => {
      // Always use the date range from DateRangePicker
      return api.getRangeSummary(startDate, endDate);
    },
  });

  // Combine device info with summary data from API
  // Also deduplicate by device_id to remove duplicates
  const summaryData: SummaryRow[] = (() => {
    if (!summaryQuery.data?.success || !devicesQuery.data?.success) {
      return [];
    }

    const devices = devicesQuery.data.data;
    const summaries = summaryQuery.data.data;

    // Deduplicate by device_id using Map - keep first occurrence only
    const uniqueMap = new Map<string, DailySummary>();
    summaries.forEach((item: DailySummary) => {
      const key = item.device_id.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    return Array.from(uniqueMap.values()).map((item: DailySummary) => {
      const device = devices.find((d: Device) => d.id === item.device_id);
      return {
        device_id: item.device_id,
        name: device?.location || item.current?.location || "-",
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
      // Last 3 months
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 3);
      
      // Convert to date range for API (first day of monthAgo to today)
      const fromDate = new Date(monthAgo.getFullYear(), monthAgo.getMonth(), 1);
      
      setStartDate(formatApiDate(fromDate));
      setEndDate(formatApiDate(today));
      setSelectedFromMonth(monthAgo);
      setSelectedToMonth(today);
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
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Trend Mingguan / Bulanan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Trend availability dari event log.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Filter Section - Combined Tabs + Date Range + Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Tabs + Date Range Picker */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Tabs */}
              <Tabs value={tabValue} onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                  <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Date Range Picker - Show different picker based on tab */}
              {tabValue === "mingguan" ? (
                <DateRangePicker
                  from={selectedStartDate}
                  to={selectedEndDate}
                  onSelect={handleDateRangeSelect}
                  fromPlaceholder="Dari"
                  toPlaceholder="Sampai"
                />
              ) : (
                <MonthYearPicker
                  fromMonth={selectedFromMonth}
                  toMonth={selectedToMonth}
                  onSelect={handleMonthRangeSelect}
                  fromPlaceholder="Dari bulan"
                  toPlaceholder="Sampai bulan"
                />
              )}
            </div>

            {/* Right: Avg Availability + Refresh Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                <span className="text-sm text-muted-foreground">Avg:</span>
                <span className="text-lg font-bold">{avgAvailability}%</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 sm:w-auto"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
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
                      {formatHours(item.summary.operational_off_hours)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

