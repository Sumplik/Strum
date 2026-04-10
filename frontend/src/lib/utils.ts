import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Never";
  const dateStr = dateInput instanceof Date ? dateInput.toISOString() : dateInput;
  try {
    const date = new Date(dateStr!);
    if (isNaN(date.getTime())) return "Invalid";
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "Error";
  }
}

