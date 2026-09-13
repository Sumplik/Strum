import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { cn, formatApiDate } from "@/lib/utils";
import { useBranch } from "@/app/useBranch";
import { DatePicker } from "@/components/ui/date-picker";
import { useSummary } from "@/features/dashboard/hooks/useSummary";
import { ExportCsvButton } from "@/features/dashboard/components/ExportCsvButton";
import { BranchBadge, LocationBadge } from "@/features/dashboard/components/DeviceBadges";
import { availabilityColor, formatHours } from "@/features/dashboard/utils/summary";

const COLUMN_COUNT = 10;

export default function ReportsDailyPage() {
  const { scope, branchLabel } = useBranch();
  const label = branchLabel(scope);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());
  const tanggal = formatApiDate(selectedDate ?? new Date());

  const { query, rows, averageAvailabilityPercent, operationalHours, errorMessage } = useSummary(scope, tanggal, tanggal);
  const isRefreshing = query.isFetching;

  if (query.isLoading) {
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
            <span className="ml-2 text-sm sm:text-base font-semibold text-muted-foreground">{label}</span>
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Laporan ketersediaan mesin harian berdasarkan jam operasional
            {operationalHours ? ` cabang (${operationalHours.start}–${operationalHours.end})` : " masing-masing cabang"}
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

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-2 sm:px-3 py-1.5">
                <span className="text-xs sm:text-sm text-muted-foreground">Avg:</span>
                <span className="text-base sm:text-lg font-bold">{averageAvailabilityPercent.toFixed(1)}%</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => query.refetch()}
                disabled={isRefreshing}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
              </Button>

              {/* Log semua mesin dalam cakupan terpilih untuk tanggal terpilih */}
              <ExportCsvButton
                params={{ scope, start: tanggal, end: tanggal }}
                label="Export CSV"
                title={`Unduh log semua mesin ${label} tanggal ${tanggal}`}
                variant="outline"
                className="h-8 sm:h-9 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <Card className="bg-white dark:bg-[var(--card)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px] sm:w-[220px]">Mesin</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead className="hidden sm:table-cell">Lokasi</TableHead>
                    <TableHead className="text-right">ON</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Idle</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">On Duty</TableHead>
                    <TableHead className="text-right">OFF</TableHead>
                    <TableHead className="text-right">Disconnect</TableHead>
                    <TableHead className="text-right">Availability</TableHead>
                    <TableHead className="text-right">Export</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map(({ device, summary }) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-bold text-sm">{device.code}</TableCell>
                      <TableCell>
                        <BranchBadge branchId={device.branchId} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <LocationBadge location={device.location} />
                      </TableCell>

                      <TableCell className="text-right text-sm">{formatHours(summary.onTotalHours)}</TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">
                        {formatHours(summary.idleHours)}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell">
                        {formatHours(summary.onDutyHours)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatHours(summary.offHours)}</TableCell>
                      <TableCell className="text-right text-sm">{formatHours(summary.disconnectHours)}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={cn("font-bold", availabilityColor(summary.availabilityPercent))}>
                          {summary.availabilityPercent.toFixed(1)}%
                        </span>
                      </TableCell>

                      {/* Log mesin ini saja untuk tanggal terpilih */}
                      <TableCell className="text-right">
                        <ExportCsvButton
                          params={{ scope: device.branchId, code: device.code, start: tanggal, end: tanggal }}
                          title={`Unduh log ${device.code} tanggal ${tanggal}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                        Belum ada mesin terdaftar di {label}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
