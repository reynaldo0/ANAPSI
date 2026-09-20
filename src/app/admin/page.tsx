import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description: "Moderasi laporan, kelola pengguna, dan pantau lokasi pengguna — untuk admin ANAPSI.",
};

export default function AdminPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-h2 font-bold">Dashboard Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor laporan, pengguna, dan lokasi pengguna secara realtime. Moderasilah laporan
          aksesibilitas dari komunitas agar data tetap terpercaya.
        </p>
      </header>
      <main>
        <AdminPanel />
      </main>
    </div>
  );
}
