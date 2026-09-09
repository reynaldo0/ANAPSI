import type { Metadata } from "next";
import Link from "next/link";
import { SavedPlacesList } from "@/components/saved/SavedPlacesList";

export const metadata: Metadata = {
  title: "Tempat Tersimpan",
  description: "Tempat yang kamu simpan untuk dikunjungi atau diakses kembali.",
};

export default function SavedPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold">Tempat Tersimpan</h1>
          <p className="mt-1 text-muted-foreground">
            Tempat yang kamu tandai untuk dikunjungi kembali.
          </p>
        </div>
        <Link
          href="/map"
          className="inline-flex h-10 items-center gap-2 rounded-12 bg-primary-soft px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Jelajahi Peta
        </Link>
      </header>
      <main>
        <SavedPlacesList />
      </main>
    </div>
  );
}
