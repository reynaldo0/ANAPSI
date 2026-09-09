import type { LucideIcon } from "lucide-react";
import { HelpCircle, ShieldCheck, Users } from "lucide-react";
import type { VerificationStatus } from "@/types";

const STATUSES: Record<VerificationStatus, { label: string; symbol: string; icon: LucideIcon }> = {
  VERIFIED: { label: "Terverifikasi", symbol: "✓", icon: ShieldCheck },
  COMMUNITY_REPORTED: { label: "Dilaporkan Komunitas", symbol: "↗", icon: Users },
  UNKNOWN: { label: "Belum Terverifikasi", symbol: "?", icon: HelpCircle },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const meta = STATUSES[status];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span aria-hidden="true">{meta.symbol}</span>
      {meta.label}
    </span>
  );
}