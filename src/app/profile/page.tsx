"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TourTrigger } from "@/components/tutorial/TourTrigger";
import { ProfileFoundation } from "@/components/profile/ProfileFoundation";
import { ProfileSwitcher } from "@/components/profile/ProfileSwitcher";
import { MyReports } from "@/components/profile/MyReports";
import { GamificationSummary } from "@/components/profile/GamificationSummary";
import { announceLiveRegion } from "@/lib/announcement";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAuth } from "@/lib/state/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { ONBOARDING_CHOICES, type UserType } from "@/lib/constants";

export default function ProfilePage() {
  const { userType, setUserType } = useAccessibilityProfile();
  const { user, loading, logout, refresh } = useAuth();
  const { toast } = useToast();

  const [savingProfile, setSavingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  const saveProfile = async (choice: UserType) => {
    setUserType(choice);
    const meta = ONBOARDING_CHOICES.find((c) => c.value === choice);
    announceLiveRegion(`${meta?.label ?? "Pilihan"} disimpan.`, { assertive: true });
    if (choice === "NON_DISABLED") {
      toast({ tone: "success", title: "Pilihan tersimpan", message: "Pengalaman standar aktif." });
      return;
    }
    if (!user) {
      toast({ tone: "success", title: "Profil tersimpan", message: "Tersimpan di perangkat ini." });
      return;
    }
    setSavingProfile(true);
    try {
      const response = await fetch("/api/profile/accessibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: choice }),
      });
      if (response.ok) {
        toast({ tone: "success", title: "Profil tersimpan", message: "Tersimpan di akunmu." });
      } else {
        toast({
          tone: "warning",
          title: "Tersimpan di perangkat",
          message: "Profil tersimpan di perangkat ini; sinkronisasi akun belum tersedia.",
        });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || displayName.trim().length < 2) return;
    setSavingName(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (response.ok) {
        await refresh();
        toast({ tone: "success", title: "Nama diperbarui", message: "Perubahan tersimpan." });
      } else {
        toast({ tone: "danger", title: "Gagal simpan", message: "Coba lagi beberapa saat." });
      }
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-black">Profil</h1>
          <p className="mt-2 text-muted-foreground">
            Kelola akun, profil aksesibilitas, dan pengalaman BLINDSPOT.
          </p>
        </div>
        <TourTrigger feature="profile" />
      </div>

      <section className="mt-6 space-y-6" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-h3 font-black">
          Akun
        </h2>
        {loading ? (
          <p className="text-muted-foreground">Memuat sesi…</p>
        ) : user ? (
          <div className="space-y-4 rounded-20 border-2 border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">
              Masuk sebagai <strong className="text-foreground">{user.email}</strong>
            </p>
            <form className="flex flex-wrap items-end gap-3" onSubmit={saveName}>
              <div className="min-w-52 flex-1">
                <Input
                  label="Nama tampilan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="secondary" loading={savingName}>
                Simpan nama
              </Button>
            </form>
            <Button variant="outline" onClick={() => void logout()}>
              Keluar
            </Button>
          </div>
        ) : (
          <div className="rounded-20 border-2 border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">
              Kamu belum masuk. Daftar untuk menyimpan profil secara permanen.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-14 bg-primary px-5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Daftar
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-14 border-2 border-border bg-background px-5 text-base font-bold text-foreground transition-colors hover:bg-muted"
              >
                Masuk
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="a11y-heading">
        <h2 id="a11y-heading" className="text-h3 font-black">
          Kamu siapa?
        </h2>
        <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card" data-tour="profile-switcher">
          <ProfileSwitcher
            value={userType}
            onChange={(choice) => void saveProfile(choice)}
            legend="Pilih pengalaman yang paling sesuai"
          />
          {savingProfile ? (
            <p className="mt-3 text-sm text-muted-foreground">Menyimpan ke akun…</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="audio-heading">
        <h2 id="audio-heading" className="text-h3 font-black">
          Audio & suara
        </h2>
        <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
          <ProfileFoundation />
        </div>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="text-h3 font-black">
          Tempat favorit
        </h2>
        <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            Tempat yang kamu simpan tersedia di halaman Tempat Favorit.
          </p>
          <Link
            href="/saved"
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-14 bg-primary-soft px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Lihat Tempat Favorit →
          </Link>
        </div>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="text-h3 font-black">
          Tampilan & aksesibilitas
        </h2>
        <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            Atur tema (terang/gelap/sistem), ukuran teks, kontras tinggi, dan kurangi animasi.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-14 bg-primary-soft px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Buka Pengaturan →
          </Link>
        </div>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="my-reports-heading" data-tour="profile-reports">
        <div>
          <h2 id="my-reports-heading" className="text-h3 font-black">
            Laporan saya
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Riwayat laporan yang kamu kirim beserta status dan verifikasinya.
          </p>
        </div>
        <MyReports />
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="gamification-heading">
        <div>
          <h2 id="gamification-heading" className="text-h3 font-black">
            Poin & lencana
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Setiap laporan fasilitas rusak memberi poin dan membuka lencana. Berfungsi tanpa harus masuk.
          </p>
        </div>
        <div className="rounded-20 border-2 border-border bg-card p-5 shadow-card" data-tour="profile-gamification">
          <GamificationSummary />
        </div>
      </section>
    </div>
  );
}