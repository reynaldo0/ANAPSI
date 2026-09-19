import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-muted-foreground"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-lg font-semibold">Memuat dashboard admin…</p>
      <p className="text-sm">Menyiapkan laporan, pengguna, dan pemantauan lokasi.</p>
    </div>
  );
}