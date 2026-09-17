import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Panel Admin",
  description: "Moderasi laporan aksesibilitas — hanya untuk admin ANAPSI.",
};

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-h2 font-bold">Panel Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Tinjau, setujui, atau tolak laporan aksesibilitas dari komunitas.
        </p>
      </header>
      <main>
        <AdminPanel />
      </main>
    </div>
  );
}
