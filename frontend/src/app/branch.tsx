import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ALL_BRANCHES, BranchContext, formatBranchId, type BranchOption, type DeviceScope } from "./useBranch";

const SCOPE_STORAGE_KEY = "strum.scope";
const BRANCH_STORAGE_KEY = "strum.branchId";

// Cabang tempat alat monitoring pertama kali dipasang; dipakai sebelum pengguna memilih sendiri.
const DEFAULT_BRANCH_ID = "UP2W6";

const ALL_BRANCHES_LABEL = "Semua cabang";

// Dipakai saat daftar cabang belum/gagal diambil dari server agar dropdown tetap bisa dipakai.
const FALLBACK_BRANCHES: BranchOption[] = ["UP2W1", "UP2W2", "UP2W3", "UP2W4", "UP2W5", "UP2W6"].map((id) => ({
  id,
  label: formatBranchId(id),
}));

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage bisa tidak tersedia (private mode); pilihan tetap berlaku untuk sesi ini.
  }
}

// State pilihan yang tersimpan di localStorage.
function useStoredValue(key: string, fallback: string): [string, (value: string) => void] {
  const [value, setValue] = React.useState<string>(() => readStored(key, fallback));
  const set = React.useCallback(
    (next: string) => {
      setValue(next);
      writeStored(key, next);
    },
    [key],
  );
  return [value, set];
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [storedScope, setStoredScope] = useStoredValue(SCOPE_STORAGE_KEY, DEFAULT_BRANCH_ID);
  const [storedBranchId, setStoredBranchId] = useStoredValue(BRANCH_STORAGE_KEY, DEFAULT_BRANCH_ID);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: api.getBranches,
    staleTime: 60_000,
  });

  const branches = React.useMemo<BranchOption[]>(() => {
    if (!branchesQuery.data?.success) return FALLBACK_BRANCHES;
    return branchesQuery.data.data.map((branch) => ({
      id: branch.id,
      label: branch.name && branch.name !== branch.id ? `${formatBranchId(branch.id)} · ${branch.name}` : formatBranchId(branch.id),
      deviceCount: branch.deviceCount,
    }));
  }, [branchesQuery.data]);

  const isKnown = React.useCallback((id: string) => branches.some((b) => b.id === id), [branches]);

  // Kalau cabang yang tersimpan sudah tidak ada di server, pakai default atau cabang pertama.
  const branchId = React.useMemo(() => {
    if (isKnown(storedBranchId)) return storedBranchId;
    if (isKnown(DEFAULT_BRANCH_ID)) return DEFAULT_BRANCH_ID;
    return branches[0]?.id ?? storedBranchId;
  }, [branches, isKnown, storedBranchId]);

  const scope: DeviceScope = storedScope === ALL_BRANCHES || isKnown(storedScope) ? storedScope : branchId;

  // Memilih satu cabang juga memperbarui cabang konkret terakhir; memilih "semua" membiarkannya.
  const setScope = React.useCallback(
    (next: DeviceScope) => {
      setStoredScope(next);
      if (next !== ALL_BRANCHES) setStoredBranchId(next);
    },
    [setStoredScope, setStoredBranchId],
  );

  const branchLabel = React.useCallback(
    (target: DeviceScope) =>
      target === ALL_BRANCHES ? ALL_BRANCHES_LABEL : (branches.find((b) => b.id === target)?.label ?? formatBranchId(target)),
    [branches],
  );

  const value = React.useMemo(
    () => ({ scope, setScope, branchId, branches, isLoading: branchesQuery.isLoading, branchLabel }),
    [scope, setScope, branchId, branches, branchesQuery.isLoading, branchLabel],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
