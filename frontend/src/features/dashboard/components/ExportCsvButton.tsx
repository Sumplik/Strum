import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type LogExportParams } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ExportCsvButtonProps {
  params: LogExportParams;
  label?: string;
  title?: string;
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}

// Unduh log telemetri sebagai CSV untuk cakupan di `params` (satu cabang, atau satu mesin jika ada `code`).
export function ExportCsvButton({ params, label = "CSV", title, variant = "ghost", className }: ExportCsvButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      await api.downloadLogsCsv(params);
    } catch (err) {
      toast.error("Download gagal", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={handleDownload}
      disabled={busy}
      title={title}
      className={cn("h-8 px-2 sm:px-3 text-xs", className)}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
