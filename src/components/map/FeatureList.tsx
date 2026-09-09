import { CheckCircle2, HelpCircle, Users } from "lucide-react";
import { verificationLabel } from "@/lib/verification";
import { cn } from "@/lib/cn";
import type { MapFeatureReturn } from "@/types";

interface FeatureListProps {
  features: MapFeatureReturn[];
  onSelect: (placeId: string | null) => void;
  emptyMessage?: string;
}

function VerificationIcon({ status }: { status: MapFeatureReturn["verification"] }) {
  if (status === "VERIFIED") return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />;
  if (status === "COMMUNITY_REPORTED") return <Users className="h-4 w-4 text-warning" aria-hidden="true" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

export function FeatureList({ features, onSelect, emptyMessage = "Tidak ada data untuk layer ini." }: FeatureListProps) {
  if (features.length === 0) {
    return <p className="rounded-16 border border-border bg-card p-4 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {features.map((feature) => (
        <li key={feature.id}>
          <button
            type="button"
            onClick={() => onSelect(feature.placeId ?? null)}
            className="w-full rounded-16 border border-border bg-card p-4 text-left shadow-card transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-12 border-2 border-foreground/40 text-lg font-bold",
                  feature.tone === "success" && "border-success text-success",
                  feature.tone === "warning" && "border-warning text-warning",
                  feature.tone === "danger" && "border-danger text-danger",
                )}
              >
                {feature.symbol}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{feature.label}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                  <span>{feature.placeName ?? "Area umum"}</span>
                  <span className="inline-flex items-center gap-1">
                    <VerificationIcon status={feature.verification} />
                    {verificationLabel(feature.verification)}
                  </span>
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}