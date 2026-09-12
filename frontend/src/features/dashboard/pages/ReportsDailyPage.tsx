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
import { RefreshCw, Download } from "lucide-react";
import { api } from "@/lib/api";
import { averagePercent, cn, formatApiDate, formatHours } from "@/lib/utils";
import { useDevices } from "@/features/dashboard/hooks/useDevices";
import type { DeviceSummary } from "@/types/api";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

interface SummaryRow {
  device_id: string;
  location: string | null;
  summary: DeviceSummary;
}

export default function ReportsDailyPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());
  const tanggal = formatApiDate(selectedDate ?? new Date());

  const devicesQuery = useDevices();
  const summaryQuery = useQuery({
    queryKey: ["daily-summary", tanggal],
    queryFn: () => api.getDailySummary(tanggal),
  });

  const devices = devicesQuery.data?.success ? devicesQuery.data.data : [];
  const rows: SummaryRow[] =
    summaryQuery.data?.success && devicesQuery.data?.success
      ? summaryQuery.data.data.map((item) => ({
          device_id: item.device_id,
          location:
            item.current?.location ?? devices.find((d) => d.id === item.device_id)?.location ?? null,
          summary: item.summary,
        }))
      : [];

  const isLoading = devicesQuery.isLoading || summaryQuery.isLoading;
  const isRefreshing = summaryQuery.isFetching;
  const avgAvailability = averagePercent(rows.map((r) => r.summary.availability_percent));

  const download = async (format: "csv" | "json") => {
    try {
      await api.downloadLogs(format, tanggal, tanggal);
    } catch {
      toast.error("Download gagal");
    }
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
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-base sm:text-lg font-semibold">
            Summary Harian (Availability)
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Laporan ketersediaan mesin harian berdasarkan data operasional
          </p>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                Tanggal:
              </span>
              <DatePicker
                date={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                placeholder="Pilih"
                className="w-[130px] sm:w-auto"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-2 sm:px-3 py-1.5">
                <span className="text-xs sm:text-sm text-muted-foreground">Avg:</span>
                <span className="text-base sm:text-lg font-bold">{avgAvailability}%</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => summaryQuery.refetch()}
                disabled={isRefreshing}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
              </Button>

              <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2">
                {(["json", "csv"] as const).map((format) => (
                  <Button
                    key={format}
                    size="sm"
                    variant="ghost"
                    onClick={() => download(format)}
                    className="h-8 px-2 sm:px-3 text-xs"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="text-right">Disconnect</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.device_id}>
                    <TableCell className="font-medium">
                      <span className="font-bold text-sm">{item.device_id}</span>
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
                      {formatHours(item.summary.off_hours)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatHours(item.summary.disconnect_hours)}
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
