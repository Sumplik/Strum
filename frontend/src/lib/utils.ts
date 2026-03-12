import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date/time to "HH:mm:ss, dd/m/yyyy" format
 * Example: "12:58:30, 11/3/2026"
 * Uses colon (:) for time separator, time comes first before date
 */
export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "-";
  try {
    const date = new Date(d);
    const time = date.toLocaleTimeString("en-GB", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    const dateStr = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    return `${time}, ${dateStr}`;
  } catch {
    return "-";
  }
}
