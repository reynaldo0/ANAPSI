import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description: "Moderasi laporan, kelola pengguna, dan pantau lokasi pengguna — untuk admin ANAPSI.",
};

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-h2 font-bold">Dashboard Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Kelola seluruh data ANAPSI: moderasi laporan, aksesibilitas tempat, akun pengguna,
          dan pemantauan lokasi serta aktivitas terakhir secara realtime.
        </p>
      </header>
      <main>
        <AdminPanel />
      </main>
    </div>
  );
}
