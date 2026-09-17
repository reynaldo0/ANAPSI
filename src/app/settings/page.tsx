import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Atur tampilan, aksesibilitas, dan preferensi ANAPSI.",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-h2 font-bold">Pengaturan</h1>
        <p className="mt-1 text-muted-foreground">
          Sesuaikan tampilan dan aksesibilitas sesuai kebutuhanmu.
        </p>
      </header>
      <main>
        <SettingsPanel />
      </main>
    </div>
  );
}
