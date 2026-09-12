import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OperationalHours } from "@/types/api";

const DEFAULT_HOURS: OperationalHours = { start: "08:00", end: "17:00" };

const hourOf = (time: string) => parseInt(time.split(":")[0], 10);

type SaveMessage = { type: "success" | "error"; text: string };

function OperationalHoursForm({ initial }: { initial: OperationalHours }) {
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState(initial.start);
  const [endTime, setEndTime] = useState(initial.end);
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null);

  const saveMutation = useMutation({
    mutationFn: (hours: OperationalHours) => api.setOperasional(hours.start, hours.end),
    onSuccess: (data) => {
      if (data.success) {
        setSaveMessage({ type: "success", text: "Jam operasional berhasil disimpan!" });
        queryClient.invalidateQueries({ queryKey: ["operasional"] });
      } else {
        setSaveMessage({ type: "error", text: data.message || "Gagal menyimpan" });
      }
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: () => {
      setSaveMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan" });
    },
  });

  const isSaving = saveMutation.isPending;

  const handleSave = () => {
    setSaveMessage(null);
    saveMutation.mutate({ start: startTime, end: endTime });
  };

  const handleReset = () => {
    setStartTime(DEFAULT_HOURS.start);
    setEndTime(DEFAULT_HOURS.end);
    setSaveMessage(null);
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <p className="text-sm text-muted-foreground">
        Atur jam operasional untuk semua mesin. Availability dihitung berdasarkan rentang waktu ini.
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
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>

        <Button variant="outline" onClick={handleReset} disabled={isSaving} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>

        {saveMessage && (
          <span
            className={cn(
              "text-sm font-medium ml-2",
              saveMessage.type === "success" ? "text-green-600" : "text-red-600",
            )}
          >
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["operasional"],
    queryFn: () => api.getOperasional(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  const current = data?.success ? data.data : DEFAULT_HOURS;
  const hoursPerDay = hourOf(current.end) - hourOf(current.start);

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-4 px-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
            <Clock className="h-5 w-5" />
            Pengaturan Jam Operasional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OperationalHoursForm initial={current} />
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-[var(--card)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Informasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Jam operasional mempengaruhi perhitungan availability mesin</p>
            <p>• Waktu di luar jam operasional tidak dihitung dalam availability</p>
            <p>• Default: 08:00 - 17:00 (Senin - Jumat)</p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Jam Operasional Saat Ini:</span>
              <span className="text-sm font-bold text-primary">
                {current.start} - {current.end}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {hoursPerDay} jam operasional per hari
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
