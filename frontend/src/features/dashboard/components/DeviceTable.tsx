import type { Device } from "@/types/device";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { StatusBadge, WarningBadge } from "./StatusBadge";
import { BranchBadge, LocationBadge } from "./DeviceBadges";
import { fmtDateTime } from "@/lib/utils";

interface DeviceTableProps {
  devices: Device[];
  onSelect: (d: Device) => void;
}

const COLUMN_COUNT = 8;

export function DeviceTable({ devices, onSelect }: DeviceTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px] sm:min-w-[140px]">ID</TableHead>
                <TableHead>Cabang</TableHead>
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
                  <TableCell className="font-extrabold text-sm">{d.code}</TableCell>
                  <TableCell>
                    <BranchBadge branchId={d.branchId} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <LocationBadge location={d.location} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {d.online ? <StatusBadge status={d.status} /> : <WarningBadge device={d} />}
                    </div>
                  </TableCell>
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

              {devices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada perangkat terdaftar / data kosong.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
