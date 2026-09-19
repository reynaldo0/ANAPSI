import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-lg font-semibold">Memuat…</p>
      <p className="text-sm">Mohon tunggu sebentar.</p>
    </div>
  );
}