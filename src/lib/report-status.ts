import type { BadgeTone } from "@/components/ui/Badge";
import type { ReportStatus } from "@/types";

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; tone: BadgeTone; symbol: string }> = {
  PENDING: { label: "Menunggu verifikasi", tone: "neutral", symbol: "⌛" },
  VERIFIED: { label: "Terverifikasi", tone: "success", symbol: "✓" },
  ACTIVE: { label: "Masih relevan", tone: "success", symbol: "✓" },
  OUTDATED: { label: "Mungkin usang", tone: "warning", symbol: "⚠" },
  RESOLVED: { label: "Sudah diperbaiki", tone: "neutral", symbol: "✓" },
  REJECTED: { label: "Ditolak", tone: "danger", symbol: "✕" },
};