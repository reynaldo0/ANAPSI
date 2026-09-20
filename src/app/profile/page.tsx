"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  User,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  Bookmark,
  FileText,
  Sun,
  Moon,
  Monitor,
  ZoomIn,
  ZoomOut,
  Contrast,
  Minimize2,
  Volume2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AudioControl } from "@/components/ui/AudioControl";
import { MyReports } from "@/components/profile/MyReports";
import { GamificationSummary } from "@/components/profile/GamificationSummary";
import { announceLiveRegion } from "@/lib/announcement";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAuth } from "@/lib/state/AuthContext";
import { useAppearanceSettings } from "@/lib/state/SettingsContext";
import { useToast } from "@/components/ui/Toast";
import { ONBOARDING_CHOICES, type UserType } from "@/lib/constants";
import type { AppearanceTheme } from "@/types";
import { cn } from "@/lib/cn";

/* ─── sub-components ─────────────────────────────────────────────────── */

const THEME_OPTIONS: { value: AppearanceTheme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Sistem", Icon: Monitor },
  { value: "light", label: "Terang", Icon: Sun },
  { value: "dark", label: "Gelap", Icon: Moon },
];

const TEXT_SIZES = [
  { ratio: 0.875, label: "Kecil" },
  { ratio: 1, label: "Normal" },
  { ratio: 1.125, label: "Besar" },
  { ratio: 1.25, label: "X-Besar" },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
  children,
  className,
}: {
  icon?: typeof Sun;
  label: string;
  desc?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[52px] items-center justify-between gap-3 px-4 py-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{label}</p>
          {desc ? <p className="text-xs text-muted-foreground">{desc}</p> : null}
        </div>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

/* ─── halaman utama ───────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { userType, setUserType } = useAccessibilityProfile();
  const { user, logout, refresh } = useAuth();
  const { settings, setTheme, toggleHighContrast, toggleReduceMotion, setTextSize } = useAppearanceSettings();
  const { toast } = useToast();
  const themeId = useId();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  const saveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || displayName.trim().length < 2) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (res.ok) {
        await refresh();
        toast({ tone: "success", title: "Nama diperbarui", message: "Tersimpan." });
        announceLiveRegion("Nama berhasil diperbarui.");
      } else {
        toast({ tone: "danger", title: "Gagal simpan", message: "Coba lagi." });
      }
    } finally {
      setSavingName(false);
    }
  };

  const saveProfile = async (choice: UserType) => {
    setUserType(choice);
    const meta = ONBOARDING_CHOICES.find((c) => c.value === choice);
    announceLiveRegion(`${meta?.label ?? "Profil"} dipilih.`, { assertive: true });
    if (!user || choice === "NON_DISABLED") {
      toast({ tone: "success", title: "Profil aktif", message: meta?.label ?? "Tersimpan." });
      return;
    }
    try {
      await fetch("/api/profile/accessibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: choice }),
      });
      toast({ tone: "success", title: "Profil tersimpan", message: "Tersimpan di akun." });
    } catch {
      toast({ tone: "warning", title: "Tersimpan di perangkat", message: "Sinkronisasi belum tersedia." });
    }
  };

  const handleTheme = (t: AppearanceTheme) => {
    setTheme(t);
    announceLiveRegion(`Tema: ${THEME_OPTIONS.find((o) => o.value === t)?.label ?? t}.`);
  };

  const handleTextSize = (ratio: number) => {
    setTextSize(ratio);
    announceLiveRegion(`Ukuran teks: ${TEXT_SIZES.find((s) => s.ratio === ratio)?.label ?? "Normal"}.`);
    document.documentElement.style.fontSize = `${ratio * 16}px`;
  };

  /* ── render ── */
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-6 md:pb-10">

      <h1 className="mb-1 text-2xl font-black">Profil</h1>
      <p className="mb-4 text-sm text-muted-foreground">Akun, aksesibilitas, dan tampilan</p>

      {/* ══════════ AKUN ══════════ */}
      <SectionLabel>Akun</SectionLabel>

      {user ? (
        /* ── sudah login ── */
        <Card>
          {/* Avatar baris */}
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground">
              {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{user.displayName ?? "–"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            {user.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
              </Link>
            ) : null}
          </div>

          {/* Edit nama */}
          <div className="border-t border-border px-4 py-3">
            <form onSubmit={saveName} className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Nama tampilan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="mt-6 shrink-0">
                <Button type="submit" size="sm" variant="secondary" loading={savingName}>
                  Simpan
                </Button>
              </div>
            </form>
          </div>

          {/* Quick links */}
          <Link
            href="/saved"
            className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
          >
            <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1">Tempat Tersimpan</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>

          <Link
            href="/report"
            className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1">Buat Laporan Baru</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm text-danger transition-colors hover:bg-muted"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span>Keluar dari akun</span>
          </button>
        </Card>
      ) : (
        /* ── belum login — tampilkan tombol, bukan blokir konten ── */
        <Card>
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-bold">Belum masuk</p>
              <p className="text-xs text-muted-foreground">Masuk untuk simpan profil dan laporan</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
            <Link
              href="/login?returnTo=/profile"
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
            >
              <LogIn className="h-4 w-4" aria-hidden /> Masuk
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <UserPlus className="h-4 w-4" aria-hidden /> Daftar
            </Link>
          </div>
        </Card>
      )}

      {/* ══════════ PROFIL AKSESIBILITAS ══════════ */}
      <SectionLabel>Profil aksesibilitas</SectionLabel>
      <Card>
        <div className="px-4 py-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Pilih siapa kamu — BLINDSPOT menyesuaikan rute, peringatan, dan tampilan.
          </p>
          <div className="space-y-2">
            {ONBOARDING_CHOICES.map((choice) => {
              const active = userType === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => void saveProfile(choice.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all active:scale-[0.99]",
                    active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <choice.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-bold", active && "text-primary")}>
                      {choice.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{choice.tagline}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ══════════ TAMPILAN ══════════ */}
      <SectionLabel>Tampilan</SectionLabel>

      {/* Tema */}
      <div
        role="radiogroup"
        aria-label="Tema tampilan"
        className="mb-3 grid grid-cols-3 gap-2"
      >
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const sel = settings.theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sel}
              id={`${themeId}-${value}`}
              onClick={() => handleTheme(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-semibold transition-all active:scale-95",
                sel ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden /> {label}
            </button>
          );
        })}
      </div>

      <Card>
        {/* Ukuran teks */}
        <div className="px-4 py-3">
          <p className="mb-2 text-sm font-semibold">Ukuran teks</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Perkecil teks"
              disabled={settings.textSize <= TEXT_SIZES[0].ratio}
              onClick={() => {
                const i = TEXT_SIZES.findIndex((s) => s.ratio === settings.textSize);
                if (i > 0) handleTextSize(TEXT_SIZES[i - 1].ratio);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ZoomOut className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex flex-1 gap-1">
              {TEXT_SIZES.map(({ ratio, label }) => {
                const sel = settings.textSize === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleTextSize(ratio)}
                    aria-label={`Ukuran teks ${label}`}
                    aria-pressed={sel}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs font-semibold transition-all active:scale-95",
                      sel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span aria-hidden style={{ fontSize: `${ratio}em` }}>Aa</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Perbesar teks"
              disabled={settings.textSize >= TEXT_SIZES[TEXT_SIZES.length - 1].ratio}
              onClick={() => {
                const i = TEXT_SIZES.findIndex((s) => s.ratio === settings.textSize);
                if (i < TEXT_SIZES.length - 1) handleTextSize(TEXT_SIZES[i + 1].ratio);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ZoomIn className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Kontras tinggi */}
        <Row icon={Contrast} label="Kontras tinggi" desc="Mempertegas batas dan teks" className="border-t border-border">
          <Toggle
            checked={settings.highContrast}
            onChange={() => { toggleHighContrast(); announceLiveRegion(settings.highContrast ? "Kontras tinggi nonaktif." : "Kontras tinggi aktif."); }}
            label={`Kontras tinggi: ${settings.highContrast ? "aktif" : "nonaktif"}`}
          />
        </Row>

        {/* Kurangi animasi */}
        <Row icon={Minimize2} label="Kurangi animasi" desc="Minimalkan efek gerak" className="border-t border-border">
          <Toggle
            checked={settings.reduceMotion}
            onChange={() => { toggleReduceMotion(); announceLiveRegion(settings.reduceMotion ? "Animasi normal." : "Animasi dikurangi."); }}
            label={`Kurangi animasi: ${settings.reduceMotion ? "aktif" : "nonaktif"}`}
          />
        </Row>
      </Card>

      {/* ══════════ AUDIO ══════════ */}
      <SectionLabel>Audio & suara</SectionLabel>
      <Card>
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-semibold">Panduan suara</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Kontrol audio BLINDSPOT. Dapat berjalan bersama TalkBack/VoiceOver.
          </p>
          <AudioControl />
        </div>
      </Card>

      {/* ══════════ LAPORAN SAYA — hanya kalau login ══════════ */}
      {user ? (
        <>
          <SectionLabel>Laporan saya</SectionLabel>
          <MyReports />
        </>
      ) : null}

      {/* ══════════ POIN & LENCANA ══════════ */}
      <SectionLabel>Poin & lencana</SectionLabel>
      <Card>
        <div className="px-4 py-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Setiap laporan memberi poin. Berfungsi tanpa harus masuk.
          </p>
          <GamificationSummary />
        </div>
      </Card>

      {/* ══════════ TENTANG ══════════ */}
      <SectionLabel>Tentang</SectionLabel>
      <Card>
        <Row label="BLINDSPOT" desc="Navigate Beyond Barriers · v0.1.0">
          <span className="text-xs text-muted-foreground">Demo</span>
        </Row>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Data aksesibilitas bersumber dari komunitas. Selalu verifikasi sebelum berangkat.
        </p>
      </Card>

      <div className="h-6" aria-hidden />
    </div>
  );
}
