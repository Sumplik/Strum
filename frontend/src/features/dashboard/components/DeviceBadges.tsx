import { cn } from "@/lib/utils";
import { formatBranchId } from "@/app/useBranch";

const PILL = "inline-flex items-center rounded-full px-2 py-0.5 text-xs";

// Chip ID cabang (mis. "UP2W 6") yang dipakai di semua tabel mesin.
export function BranchBadge({ branchId, className }: { branchId: string; className?: string }) {
  return (
    <span
      className={cn(PILL, "font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", className)}
    >
      {formatBranchId(branchId)}
    </span>
  );
}

// Chip lokasi/ruangan mesin; "-" jika belum ada.
export function LocationBadge({ location, className }: { location?: string | null; className?: string }) {
  return (
    <span className={cn(PILL, "font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", className)}>
      {location ?? "-"}
    </span>
  );
}
