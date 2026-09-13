import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { queryErrorMessage } from "@/lib/query";
import { useBranch } from "@/app/useBranch";
import type { OperationalHours } from "@/types/api";

const DEFAULT_HOURS: OperationalHours = { start: "08:00", end: "17:00" };

const toMinutes = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
};

// "08:00".."16:30" -> 8.5
const hoursPerDay = ({ start, end }: OperationalHours) => Math.max(0, (toMinutes(end) - toMinutes(start)) / 60);

function OperationalHoursForm({
  branchId,
  branchLabel,
  initial,
}: {
  branchId: string;
  branchLabel: string;
  initial: OperationalHours;
}) {
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState(initial.start);
  const [endTime, setEndTime] = useState(initial.end);

  const saveMutation = useMutation({
    mutationFn: (hours: OperationalHours) => api.updateBranchHours(branchId, hours),
    onSuccess: (response) => {
      if (!response.success) {
        toast.error("Gagal menyimpan", { description: response.message });
        return;
      }
      const saved = response.data.operationalHours;
      toast.success(`Jam operasional ${branchLabel} disimpan`, { description: `${saved.start} – ${saved.end}` });
      // Availability dihitung dari jam operasional, jadi summary cabang ini ikut dimuat ulang.
      void queryClient.invalidateQueries({ queryKey: ["branch", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["branches"] });
      void queryClient.invalidateQueries({ queryKey: ["summary", branchId] });
    },
    onError: (error) => {
      toast.error("Gagal menyimpan jam operasional", { description: error.message });
    },
  });

  const isSaving = saveMutation.isPending;

  return (
    <div className="space-y-3 md:space-y-4">
      <p className="text-sm text-muted-foreground">
        Atur jam operasional untuk semua mesin di {branchLabel}. Availability dihitung berdasarkan rentang waktu ini.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Jam Mulai</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">Mesin akan dianggap "aktif" mulai jam ini</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">Jam Selesai</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">Mesin akan dianggap "aktif" sampai jam ini</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button onClick={() => saveMutation.mutate({ start: startTime, end: endTime })} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setStartTime(DEFAULT_HOURS.start);
            setEndTime(DEFAULT_HOURS.end);
          }}
          disabled={isSaving}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset ke default
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { branchId, branchLabel } = useBranch();
  const label = branchLabel(branchId);

  const branchQuery = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => api.getBranch(branchId),
  });

  if (branchQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  const errorMessage = queryErrorMessage(branchQuery, "Gagal memuat data cabang");
  if (errorMessage || !branchQuery.data?.success) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        <AlertDescription>{errorMessage ?? "Gagal memuat data cabang"}</AlertDescription>
      </Alert>
    );
  }

  const current = branchQuery.data.data.operationalHours;

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-4 px-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
            <Clock className="h-5 w-5" />
            Pengaturan Jam Operasional
            <span className="text-base font-semibold text-muted-foreground">{label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* key: form di-reset saat pindah cabang atau setelah nilai tersimpan berubah */}
          <OperationalHoursForm
            key={`${branchId}:${current.start}-${current.end}`}
            branchId={branchId}
            branchLabel={label}
            initial={current}
          />
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Informasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Jam operasional diatur per cabang dan mempengaruhi perhitungan availability mesin di cabang itu</p>
            <p>• Waktu di luar jam operasional tidak dihitung dalam availability</p>
            <p>• Default: {DEFAULT_HOURS.start} - {DEFAULT_HOURS.end}</p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Jam Operasional {label} Saat Ini:</span>
              <span className="text-sm font-bold text-primary">
                {current.start} - {current.end}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {hoursPerDay(current)} jam operasional per hari
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
