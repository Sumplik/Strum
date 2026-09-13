import { useState } from "react";
import { differenceInCalendarDays, differenceInCalendarMonths, endOfMonth, min, startOfMonth, subDays, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { MAX_SUMMARY_RANGE_DAYS } from "@/lib/api";
import { cn, formatApiDate } from "@/lib/utils";
import { useBranch } from "@/app/useBranch";
import { DateRangePicker, MonthYearPicker } from "@/components/ui/date-picker";
import { useSummary } from "@/features/dashboard/hooks/useSummary";
import { ExportCsvButton } from "@/features/dashboard/components/ExportCsvButton";
import { BranchBadge } from "@/features/dashboard/components/DeviceBadges";
import { availabilityColor, formatHours } from "@/features/dashboard/utils/summary";
import { toast } from "sonner";

type Period = "mingguan" | "bulanan";
type DateRange = { from: Date; to: Date };

const MAX_WEEKLY_RANGE_DAYS = 30;
// Tiga bulan kalender penuh selalu <= 93 hari, batas rentang di backend.
const MAX_MONTHLY_RANGE_MONTHS = 3;
const COLUMN_COUNT = 6;

// Rentang default tiap periode: 7 hari terakhir, atau 3 bulan terakhir (bulan berjalan sampai hari ini).
function defaultRange(period: Period): DateRange {
  const today = new Date();
  return period === "mingguan"
    ? { from: subDays(today, 7), to: today }
    : { from: startOfMonth(subMonths(today, MAX_MONTHLY_RANGE_MONTHS - 1)), to: today };
}

// Rentang bulanan mencakup bulan penuh, tetapi bulan berjalan dihitung sampai hari ini.
const monthRangeToDays = (range: DateRange): DateRange => ({
  from: startOfMonth(range.from),
  to: min([endOfMonth(range.to), new Date()]),
});

export default function TrendsPage() {
  const { scope, branchLabel } = useBranch();
  const label = branchLabel(scope);

  const [period, setPeriod] = useState<Period>("bulanan");
  const [weekRange, setWeekRange] = useState<DateRange>(() => defaultRange("mingguan"));
  const [monthRange, setMonthRange] = useState<DateRange>(() => defaultRange("bulanan"));
  // Rentang hari yang benar-benar dikirim ke API (turunan dari picker yang aktif).
  const [range, setRange] = useState<DateRange>(() => defaultRange("bulanan"));

  const start = formatApiDate(range.from);
  const end = formatApiDate(range.to);

  const handleDateRangeSelect = (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return;

    if (to < from) {
      toast.error("Tanggal akhir harus >= tanggal awal");
      return;
    }
    if (differenceInCalendarDays(to, from) + 1 > MAX_WEEKLY_RANGE_DAYS) {
      toast.error(`Maksimal range untuk Mingguan adalah ${MAX_WEEKLY_RANGE_DAYS} hari`);
      return;
    }

    setWeekRange({ from, to });
    setRange({ from, to });
  };

  const handleMonthRangeSelect = (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return;

    const months = differenceInCalendarMonths(to, from);
    if (months < 0) {
      toast.error("Bulan akhir harus >= bulan awal");
      return;
    }
    if (months >= MAX_MONTHLY_RANGE_MONTHS) {
      toast.error(`Maksimal range untuk Bulanan adalah ${MAX_MONTHLY_RANGE_MONTHS} bulan (${MAX_SUMMARY_RANGE_DAYS} hari)`);
      return;
    }

    setMonthRange({ from, to });
    setRange(monthRangeToDays({ from, to }));
  };

  const handlePeriodChange = (value: string) => {
    const next = value as Period;
    const initial = defaultRange(next);
    setPeriod(next);
    if (next === "mingguan") setWeekRange(initial);
    else setMonthRange(initial);
    setRange(initial);
  };

  const { query, rows, averageAvailabilityPercent, operationalHours, errorMessage } = useSummary(scope, start, end);
  const isRefreshing = query.isFetching;

  if (query.isLoading) {
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
          <CardTitle className="text-lg font-semibold">
            Trend Mingguan / Bulanan
            <span className="ml-2 text-base font-semibold text-muted-foreground">{label}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Trend availability dari event log, {start} s/d {end} · jam operasional{" "}
            {operationalHours ? `${operationalHours.start}–${operationalHours.end}` : "masing-masing cabang"}
          </p>
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

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                <span className="text-sm text-muted-foreground">Avg:</span>
                <span className="text-lg font-bold">{averageAvailabilityPercent.toFixed(1)}%</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
                disabled={isRefreshing}
                className="h-9 w-9 sm:w-auto"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>

              {/* Log semua mesin dalam cakupan terpilih untuk rentang terpilih */}
              <ExportCsvButton
                params={{ scope, start, end }}
                label="Export CSV"
                title={`Unduh log semua mesin ${label} ${start} s/d ${end}`}
                variant="outline"
                className="h-9 rounded-xl"
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesin</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead className="text-right">ON</TableHead>
                    <TableHead className="text-right">OFF</TableHead>
                    <TableHead className="text-right">Availability</TableHead>
                    <TableHead className="text-right">Export</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map(({ device, summary }) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        <span className="font-bold">{device.code}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{device.location ?? "-"}</span>
                      </TableCell>
                      <TableCell>
                        <BranchBadge branchId={device.branchId} />
                      </TableCell>
                      <TableCell className="text-right">{formatHours(summary.onTotalHours)}</TableCell>
                      <TableCell className="text-right">{formatHours(summary.operationalOffHours)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", availabilityColor(summary.availabilityPercent))}>
                          {summary.availabilityPercent.toFixed(1)}%
                        </span>
                      </TableCell>

                      {/* Log mesin ini saja untuk rentang terpilih */}
                      <TableCell className="text-right">
                        <ExportCsvButton
                          params={{ scope: device.branchId, code: device.code, start, end }}
                          title={`Unduh log ${device.code} ${start} s/d ${end}`}
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
