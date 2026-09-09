import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Terjadi masalah",
  description = "Data gagal dimuat. Silakan coba beberapa saat lagi.",
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-16 border border-danger-soft bg-danger-soft px-6 py-12 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
      <p className="text-lg font-semibold">{title}</p>
      {description ? <p className="max-w-md text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
