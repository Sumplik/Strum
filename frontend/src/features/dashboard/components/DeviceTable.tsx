import * as React from "react";
import type { Device } from "@/types/device";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn, fmtDateTime } from "@/lib/utils";

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
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px] sm:min-w-[140px]">ID</TableHead>
                <TableHead className="hidden sm:table-cell">Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Arus</TableHead>
                <TableHead className="hidden lg:table-cell">Voltase</TableHead>
                <TableHead className="hidden xl:table-cell">Last Seen</TableHead>
                <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-extrabold text-sm">{d.id}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {d.location ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="hidden md:table-cell">{d.arus ?? "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{d.voltase ?? "-"}</TableCell>
<TableCell className="hidden xl:table-cell text-xs">{fmtDateTime(d.lastSeen)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="rounded-xl h-8 px-2 sm:px-3" 
                      onClick={() => onSelect(d)}
                    >
                      <Eye className="h-3 w-3 sm:mr-2" /> 
                      <span className="hidden sm:inline">Detail</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
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
