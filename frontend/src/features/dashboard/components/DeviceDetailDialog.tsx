import * as React from "react";
import type { Device } from "@/types/device";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";

function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("id-ID");
  } catch {
    return "-";
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-bold">{value}</div>
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            Detail Mesin — {device?.id ?? "-"}
          </DialogTitle>
        </DialogHeader>

        {!device ? (
          <div className="text-sm text-muted-foreground">Tidak ada data.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="ID Mesin" value={device.id} />
            <Field label="IP Address" value={device.ipAddress ?? "-"} />
            <Field label="Status" value={<StatusBadge status={device.status} />} />
            <Field label="Last Seen" value={fmtDate(device.lastSeen)} />

            <Field label="Arus" value={device.arus ?? "-"} />
            <Field label="Voltase" value={device.voltase ?? "-"} />
            <Field label="Suhu" value={device.suhu ?? "-"} />
            <Field label="Kelembapan" value={device.kelembapan ?? "-"} />

            <Field label="Threshold Idle" value={device.thresholdIdle ?? "-"} />
            <Field label="Threshold On Duty" value={device.thresholdDuty ?? "-"} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}