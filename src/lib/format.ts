/** Pemformat angka & tanggal yang hasilnya SAMA di server dan browser (hindari hydration mismatch). */

export const fmtNum = (n: number, digits = 0) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
