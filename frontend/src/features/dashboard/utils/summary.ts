// 5.25 -> "5j 15m"
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0j 0m";

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}j ${m}m`;
}

// Warna teks availability: hijau >= 90%, kuning >= 70%, selain itu merah.
export function availabilityColor(percent: number): string {
  if (percent >= 90) return "text-green-600";
  if (percent >= 70) return "text-yellow-600";
  return "text-red-600";
}
