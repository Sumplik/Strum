import * as React from "react";
import type { Device } from "@/types/device";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("id-ID");
  } catch {
    return "-";
  }
}

export function DeviceTable({
  devices,
  onSelect,
}: {
  devices: Device[];
  onSelect: (d: Device) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arus</TableHead>
                <TableHead>Voltase</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-extrabold">{d.id}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell>{d.arus ?? "-"}</TableCell>
                  <TableCell>{d.voltase ?? "-"}</TableCell>
                  <TableCell>{fmtDate(d.lastSeen)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" className="rounded-xl" onClick={() => onSelect(d)}>
                      <Eye className="mr-2 h-4 w-4" /> Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada perangkat terdaftar / data kosong.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
