import type { ApiResponse } from "@/types/api";

interface ApiQueryState {
  isError: boolean;
  error: unknown;
  data: ApiResponse<unknown> | undefined;
}

// Pesan error dari query react-query yang membungkus ApiResponse: gagal jaringan/HTTP (pesan dari
// HttpError, biasanya `message` dari backend) atau respons `success: false`. null jika tidak ada error.
export function queryErrorMessage(query: ApiQueryState, fallback: string): string | null {
  if (query.isError) {
    return query.error instanceof Error && query.error.message ? query.error.message : fallback;
  }
  if (query.data && !query.data.success) return query.data.message || fallback;
  return null;
}
