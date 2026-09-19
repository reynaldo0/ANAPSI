import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
      <SearchX className="h-12 w-12 text-primary" aria-hidden="true" />
      <h1 className="text-h2 font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground">
        Link yang kamu buka mungkin sudah berubah atau tidak tersedia. Tenang, data pentingmu tetap aman.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-12 bg-primary px-5 text-base font-bold text-primary-foreground hover:bg-primary-hover"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}