import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export const metadata: Metadata = { title: "Komunitas" };

export default function CommunityPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-5 rounded-20 border-2 border-border bg-card p-5 shadow-card">
        <h1 className="text-h1 font-black">Komunitas</h1>
        <p className="mt-1 text-muted-foreground">
          Laporan hambatan aksesibilitas yang dikirim oleh pengguna lain. Bantu perbarui keadaannya.
        </p>
      </header>
      <CommunityFeed />
    </div>
  );
}