import { Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_BRANCHES, useBranch } from "@/app/useBranch";

interface BranchSelectProps {
  // Tawarkan "Semua cabang"; jika tidak, dropdown terikat ke cabang konkret terakhir.
  includeAll: boolean;
  className?: string;
}

// Dropdown lokasi di pojok kanan atas topbar; isi halaman dan KPI bar mengikuti pilihan ini.
export function BranchSelect({ includeAll, className }: BranchSelectProps) {
  const { scope, setScope, branchId, branches, isLoading, branchLabel } = useBranch();
  const value = includeAll ? scope : branchId;
  const Icon = includeAll ? Building2 : MapPin;

  return (
    <Select value={value} onValueChange={setScope} disabled={isLoading}>
      <SelectTrigger
        aria-label="Pilih lokasi cabang"
        className={cn("min-w-[150px] font-semibold text-foreground rounded-xl", className)}
      >
        <Icon className="text-blue-500" />
        <SelectValue placeholder="Pilih lokasi" />
      </SelectTrigger>
      <SelectContent align="end">
        {includeAll && <SelectItem value={ALL_BRANCHES}>{branchLabel(ALL_BRANCHES)}</SelectItem>}
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
