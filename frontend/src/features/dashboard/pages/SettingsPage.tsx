import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch operational hours from backend
  const { data: operasionalData, isLoading } = useQuery({
    queryKey: ["operasional"],
    queryFn: () => api.getOperasional(),
  });

  // Get current operational display values (for showing in UI)
  const currentStartTime = operasionalData?.success ? operasionalData.data.start : "08:00";
  const currentEndTime = operasionalData?.success ? operasionalData.data.end : "17:00";
  const opsHoursDisplay = operasionalData?.success 
    ? `${operasionalData.data.start} - ${operasionalData.data.end}`
    : "08:00 - 17:00";

  // Set initial values when data is loaded
  useEffect(() => {
    if (operasionalData?.success && operasionalData.data) {
      setStartTime(operasionalData.data.start);
      setEndTime(operasionalData.data.end);
    }
  }, [operasionalData]);

  // Save operational hours mutation
  const saveMutation = useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }) => {
      return api.setOperasional(start, end);
    },
    onSuccess: (data) => {
      if (data.success) {
        setSaveMessage({ type: "success", text: "Jam operasional berhasil disimpan!" });
        queryClient.invalidateQueries({ queryKey: ["operasional"] });
      } else {
        setSaveMessage({ type: "error", text: data.message || "Gagal menyimpan" });
      }
      setIsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: () => {
      setSaveMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan" });
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    setSaveMessage(null);
    saveMutation.mutate({ start: startTime, end: endTime });
  };

  const handleReset = () => {
    setStartTime("08:00");
    setEndTime("17:00");
    setSaveMessage(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card - Operational Hours */}
      <Card className="bg-white dark:bg-[var(--card)]">
<CardHeader className="pb-4 px-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
            <Clock className="h-5 w-5" />
            Pengaturan Jam Operasional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            <p className="text-sm text-muted-foreground">
              Atur jam operasional untuk semua mesin. Availability dihitung berdasarkan rentang waktu ini.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
              {/* Start Time */}
              <div className="space-y-2">
                <Label htmlFor="startTime">Jam Mulai</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Mesin akan dianggap "aktif" mulai jam ini
                </p>
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <Label htmlFor="endTime">Jam Selesai</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Mesin akan dianggap "aktif" sampai jam ini
                </p>
              </div>
            </div>

            {/* Save/Reset Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>

              {/* Status Message */}
              {saveMessage && (
                <span
                  className={cn(
                    "text-sm font-medium ml-2",
                    saveMessage.type === "success" ? "text-green-600" : "text-red-600"
                  )}
                >
                  {saveMessage.text}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
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
          
          {/* Current Operational Hours Display */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Jam Operasional Saat Ini:</span>
              <span className="text-sm font-bold text-primary">
                {opsHoursDisplay}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {parseInt(currentEndTime.split(':')[0]) - parseInt(currentStartTime.split(':')[0])} jam operasional per hari
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

