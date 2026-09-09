import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { reportCategoryLabel, severityLabel } from "@/lib/constants";
import { relativeTime, reportConfidenceNote } from "@/lib/report-reliability";
import { REPORT_STATUS_META } from "@/lib/report-status";
import type { ReportDetail } from "@/types";

interface ReportSummaryCardProps {
  report: ReportDetail;
  distanceLabel?: string;
}

export function ReportSummaryCard({ report, distanceLabel }: ReportSummaryCardProps) {
  const status = REPORT_STATUS_META[report.status];
  const freshnessNote = reportConfidenceNote(report);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/report/${report.id}`} className="font-semibold leading-snug underline-offset-2 hover:underline">
          {reportCategoryLabel(report.category)}
          <span className="sr-only">: {report.description}</span>
        </Link>
        <Badge tone={status.tone} symbol={status.symbol}>
          {status.label}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{report.description}</p>

      {report.placeName ? (
        <p className="mt-3 flex items-start gap-1 text-sm">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            {report.placeName}
            {report.address ? <span className="block text-xs text-muted-foreground">{report.address}</span> : null}
          </span>
        </p>
      ) : null}

      <dl className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <dt className="sr-only">Keparahan</dt>
          <dd>{severityLabel(report.severity)}</dd>
        </div>
        {distanceLabel ? (
          <div className="flex items-center gap-1">
            <dt className="sr-only">Jarak</dt>
            <dd>{distanceLabel}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <dt className="sr-only">Verifikasi</dt>
          <dd className="flex items-center gap-1">
            <VerificationBadge status={report.verification} />
            <span>
              {report.verificationCount > 0
                ? `${report.verificationCount} konfirmasi · ${relativeTime(report.lastVerifiedAt)}`
                : "belum ada konfirmasi ulang"}
            </span>
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="sr-only">Dilaporkan</dt>
          <dd>{relativeTime(report.createdAt)}</dd>
        </div>
      </dl>

      {freshnessNote ? (
        <p className="mt-3 rounded-10 border border-warning/40 bg-warning-soft px-3 py-2 text-xs">{freshnessNote}</p>
      ) : null}

      <Link
        href={`/report/${report.id}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-12 border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Lihat detail
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}