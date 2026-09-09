"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, MapPin, Navigation2, Star } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { RouteOption } from "@/types";
import { cn } from "@/lib/cn";

interface RouteResultCardProps {
  route: RouteOption;
}

export function RouteResultCard({ route }: RouteResultCardProps) {
  const scoreTone: BadgeTone =
    route.accessibilityScore === null ? "neutral" : route.accessibilityScore >= 80 ? "success" : route.accessibilityScore >= 40 ? "warning" : "danger";

  return (
    <Card
      className={cn("p-5", route.recommended && "border-primary bg-primary-soft/40")}
      aria-current={route.recommended ? "true" : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 font-bold">
            {route.recommended ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                Recommended
              </span>
            ) : null}
            <span>{route.label}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{route.fromName}</span>
            <span aria-hidden="true"> → </span>
            <span className="font-medium text-foreground">{route.toName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Skor aksesibilitas</p>
          <Badge tone={scoreTone}>
            {route.accessibilityScore !== null ? `${route.accessibilityScore}/100` : "Data belum tersedia"}
          </Badge>
        </div>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <div className="flex items-baseline gap-1">
          <dt className="font-medium text-foreground">Jarak</dt>
          <dd>{route.distanceLabel}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="font-medium text-foreground">Estimasi</dt>
          <dd>{route.durationLabel}</dd>
        </div>
      </dl>

      {route.reasoning.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {route.reasoning.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {route.barriers.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {route.barriers.slice(0, 3).map((barrier) => (
            <li key={`${barrier.id}-${barrier.distanceMeters}`} className="flex items-start gap-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {barrier.label} — sekitar {barrier.distanceMeters} m dari awal
              </span>
            </li>
          ))}
          {route.barriers.length > 3 ? (
            <li className="text-sm text-muted-foreground">+ {route.barriers.length - 3} hambatan lainnya</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          Tidak ada hambatan yang dilaporkan di sepanjang rute ini.
        </p>
      )}

      {route.facilities.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {route.facilities.slice(0, 3).map((facility) => (
            <li key={`${facility.id}-${facility.distanceMeters}`} className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{facility.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {route.honestNote ? (
        <p className="mt-4 rounded-10 bg-muted px-3 py-2 text-xs text-muted-foreground">{route.honestNote}</p>
      ) : null}

      <Link
        href={journeyHref(route)}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover"
      >
        <Navigation2 className="h-5 w-5" aria-hidden="true" />
        Lihat Rute
      </Link>
    </Card>
  );
}

function journeyHref(route: RouteOption): string {
  const params = new URLSearchParams();
  params.set("route", route.id);
  params.set("from", route.fromName);
  params.set("to", route.toName);
  params.set("destination", route.destinationId);
  if (route.geometry.length > 0) {
    params.set("lat", String(route.geometry[0].lat));
    params.set("lng", String(route.geometry[0].lng));
  }
  return `/journey?${params.toString()}`;
}