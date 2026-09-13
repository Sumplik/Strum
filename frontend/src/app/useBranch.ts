import { createContext, useContext } from "react";

export type BranchOption = {
  id: string; // UP2W6
  label: string; // "UP2W 6" (atau "UP2W 6 · Nama" jika cabang sudah diberi nama)
  deviceCount?: number;
};

// Nilai cakupan untuk "semua cabang sekaligus".
export const ALL_BRANCHES = "all";

// Cakupan daftar mesin: ALL_BRANCHES atau ID satu cabang.
export type DeviceScope = typeof ALL_BRANCHES | string;

export type BranchContextValue = {
  // Pilihan di dropdown topbar: satu cabang, atau ALL_BRANCHES di halaman yang mendukungnya
  // (Monitoring Mesin, Summary Harian, Trend).
  scope: DeviceScope;
  setScope: (scope: DeviceScope) => void;
  // Cabang konkret terakhir yang dipilih; dipakai halaman yang butuh satu cabang (Overview,
  // Pengaturan) meskipun `scope` sedang "semua cabang".
  branchId: string;
  branches: BranchOption[];
  isLoading: boolean;
  // Label tampilan untuk cakupan apa pun ("Semua cabang", "UP2W 6", ...).
  branchLabel: (scope: DeviceScope) => string;
};

export const BranchContext = createContext<BranchContextValue | null>(null);

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}

// "UP2W6" -> "UP2W 6", supaya tampil seperti penamaan kantor cabang.
export function formatBranchId(id: string): string {
  return id.replace(/(\d+)$/, " $1");
}
