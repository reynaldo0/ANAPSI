import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { summaryScore } from "@/lib/data/places-core";
import { cn } from "@/lib/cn";
import type { AccessibilityProfileType, PlaceSummary } from "@/types";

interface ResultListProps {
  places: PlaceSummary[];
  profile: AccessibilityProfileType | null;
  selectedPlaceId?: string | null;
  onPreview?: (id: string) => void;
}

export function ResultList({ places, profile, selectedPlaceId, onPreview }: ResultListProps) {
  if (places.length === 0) {
    return (
      <p className="rounded-16 border border-border bg-card p-4 text-sm text-muted-foreground">
        Tidak ada tempat yang cocok. Coba kata kunci lain atau ubah radius pencarian.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {places.map((place) => {
        const { score, label } = summaryScore(place, profile);
        const selected = place.id === selectedPlaceId;
        return (
          <li key={place.id}>
            <div
              className={cn(
                "rounded-16 border border-border bg-card p-4 shadow-card transition-colors",
                selected && "border-primary bg-primary-soft/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{place.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {place.address}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-8 border-2 border-foreground/40 px-2.5 py-1 text-sm font-semibold",
                    label === "Aksesibel" && "border-success text-success",
                    label === "Akses terbatas" && "border-warning text-warning",
                    label === "Banyak hambatan" && "border-danger text-danger",
                  )}
                  aria-label={`Skor aksesibilitas: ${score != null ? score.toFixed(0) + " dari 100. " : ""}${label}`}
                >
                  {score != null ? `${score.toFixed(1)}` : "?"}
                  <span className="sr-only">{label}</span>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{place.category}</span>
                {place.distanceLabel ? <span>{place.distanceLabel}</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onPreview?.(place.id)}
                  className="rounded-8 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
                >
                  {selected ? "Lepas pilihan" : "Pilih di peta"}
                </button>
                <Link
                  href={`/places/${place.id}`}
                  className="inline-flex items-center gap-1 rounded-8 bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Lihat detail
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}