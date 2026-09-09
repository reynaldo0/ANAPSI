import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage } from "@/components/search/SearchPage";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Cari Lokasi",
  description: "Cari tempat aksesibel berdasarkan nama, kawasan, atau kategori.",
};

export default function SearchRoute() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="px-4 pt-8 pb-2">
        <h1 className="text-h2 font-bold">Cari Lokasi</h1>
        <p className="mt-1 text-muted-foreground">
          Temukan tempat berdasarkan nama, kawasan, atau kategori.
        </p>
      </header>
      <main>
        {/* Suspense needed because SearchPage uses useSearchParams() */}
        <Suspense fallback={<LoadingState label="Memuat halaman pencarian…" />}>
          <SearchPage />
        </Suspense>
      </main>
    </div>
  );
}
