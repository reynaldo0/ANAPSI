import type { ReactNode } from "react";
import type { ReportStatus } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { ReportStub } from "@/types";

const STATUS: Record<ReportStatus, { label: string; tone: BadgeTone; symbol: string }> = {
  PENDING: { label: "Menunggu verifikasi", tone: "neutral", symbol: "⌛" },
  VERIFIED: { label: "Terverifikasi", tone: "success", symbol: "✓" },
  ACTIVE: { label: "Masih relevan", tone: "success", symbol: "✓" },
  OUTDATED: { label: "Mungkin usang", tone: "warning", symbol: "⚠" },
  RESOLVED: { label: "Sudah diperbaiki", tone: "neutral", symbol: "✓" },
  REJECTED: { label: "Ditolak", tone: "danger", symbol: "✕" },
};

interface ReportCardProps {
  report: ReportStub;
  action?: ReactNode;
}

export function ReportCard({ report, action }: ReportCardProps) {
  const status = STATUS[report.status];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{report.title}</h3>
        <Badge tone={status.tone} symbol={status.symbol}>
          {status.label}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{report.excerpt}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{report.authorName}</span>
          <time dateTime={report.createdAt}>{report.createdAt}</time>
          {typeof report.agree === "number" ? (
            <span>
              ✓ {report.agree} · ✗ {report.disagree ?? 0}
            </span>
          ) : null}
        </span>
        <VerificationBadge status={report.verification} />
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </Card>
  );
}