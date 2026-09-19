import { Loader2 } from "lucide-react";

export default function MapLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-[60dvh] w-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-lg font-semibold">Menyiapkan peta…</p>
      <p className="text-sm">Memuat tempat dan fitur aksesibilitas terdekat.</p>
    </div>
  );
}