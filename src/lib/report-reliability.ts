import type { ReportDetail } from "@/types";

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.floor((Date.now() - date) / 86_400_000));
}

export function reportConfidenceNote(report: ReportDetail): string | null {
  if (report.status === "RESOLVED" || report.status === "REJECTED") return null;
  const age = daysSince(report.createdAt);
  const lastVerified = daysSince(report.lastVerifiedAt);

  if (lastVerified !== null && lastVerified > 90) {
    return `Terakhir diverifikasi lebih dari ${Math.floor(lastVerified / 30)} bulan lalu.`;
  }
  if (lastVerified === null && age !== null && age > 60) {
    return "Belum ada konfirmasi ulang dari komunitas sejak dilaporkan.";
  }
  if (age !== null && age > 180) {
    return "Laporan ini sudah berumur 6 bulan atau lebih.";
  }
  return null;
}

const RELATIVE = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (Math.abs(days) < 2) return RELATIVE.format(days, "day");
  if (Math.abs(days) < 60) return RELATIVE.format(days, "day");
  return RELATIVE.format(Math.round(days / 30), "month");
}