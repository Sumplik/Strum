import * as React from "react";
import type { Device } from "@/types/device";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { cn, fmtDateTime } from "@/lib/utils";
import { useBranch } from "@/app/useBranch";

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("dark:bg-[var(--card)]", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="text-[10px] sm:text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DeviceDetailDialog({
  open,
  onOpenChange,
  device,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  device: Device | null;
}) {
  const { branchLabel } = useBranch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base font-extrabold">
            Detail Mesin — {device?.code ?? "-"}
          </DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs">
            Informasi detail termasuk status, IP address, dan data sensor mesin.
          </DialogDescription>
        </DialogHeader>

        {!device ? (
          <div className="text-sm text-muted-foreground">Tidak ada data.</div>
        ) : (
          <div className="grid gap-2 sm:gap-3 grid-cols-2">
            <Field label="ID Mesin" value={device.code} />
            <Field label="Cabang" value={branchLabel(device.branchId)} />
            <Field label="Lokasi" value={device.location ?? "-"} />
            <Field label="IP Address" value={device.ipAddress ?? "-"} />
            <Field label="Status" value={<StatusBadge status={device.effectiveStatus} />} />
            <Field label="Last Seen" value={fmtDateTime(device.lastSeen)} />

            <Field label="Arus" value={device.arus ?? "-"} />
            <Field label="Voltase" value={device.voltase ?? "-"} />
            <Field label="Suhu" value={device.suhu ?? "-"} />
            <Field label="Kelembapan" value={device.kelembapan ?? "-"} />

            <Field label="Threshold" value={device.threshold ?? "-"} />
            <Field label="Firmware" value={device.firmwareVersion ?? "-"} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
