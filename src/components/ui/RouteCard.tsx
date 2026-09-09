import { AlertTriangle, ArrowRight, Footprints } from "lucide-react";
import type { RouteStub } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface RouteCardProps {
  route: RouteStub;
  active?: boolean;
}

export function RouteCard({ route, active = false }: RouteCardProps) {
  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        active && "border-primary bg-primary-soft/50",
      )}
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <span>{route.fromName}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{route.toName}</span>
        </p>
        <Badge tone="success" symbol="✓">
          {route.accessibleLabel}
        </Badge>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <div className="flex items-baseline gap-1">
          <dt className="font-medium text-foreground">Jarak</dt>
          <dd>{route.distanceLabel}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="font-medium text-foreground">Estimasi</dt>
          <dd>{route.durationLabel}</dd>
        </div>
        {typeof route.stepsCount === "number" ? (
          <div className="flex items-center gap-1">
            <Footprints className="h-4 w-4" aria-hidden="true" />
            <dd>{route.stepsCount} anak tangga</dd>
          </div>
        ) : null}
      </dl>

      {route.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {route.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}