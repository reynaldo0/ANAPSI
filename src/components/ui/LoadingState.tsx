import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Memuat..." }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
