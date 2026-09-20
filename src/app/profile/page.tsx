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
  Settings,
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

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const THEME_OPTIONS: { value: AppearanceTheme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Sistem", Icon: Monitor },
  { value: "light", label: "Terang", Icon: Sun },
  { value: "dark", label: "Gelap", Icon: Moon },
];

const TEXT_SIZES = [
  { ratio: 0.875, label: "Kecil" },
  { ratio: 1, label: "Normal" },
  { ratio: 1.125, label: "Besar" },
  { ratio: 1.25, label: "X‑Besar" },
];

/** Toggle switch — bisa dipakai ulang */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
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

/** Row dengan label + deskripsi di kiri, action di kanan */
function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon?: typeof Sun;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-12 bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{label}</p>
          {description ? (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Section card dengan divider antar rows */
function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border rounded-20 border border-border bg-card shadow-soft">
      <div className="divide-y divide-border px-4">{children}</div>
    </div>
  );
}

/** Section header */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-7 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </h2>
  );
}

/* ─── komponen utama ───────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { userType, setUserType } = useAccessibilityProfile();
  const { user, loading, logout, refresh } = useAuth();
  const { settings, setTheme, toggleHighContrast, toggleReduceMotion, setTextSize } =
    useAppearanceSettings();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const themeId = useId();

  /* Sync displayName state dari user */
  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  /* Simpan nama */
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

  /* Simpan profil aksesibilitas */
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
      toast({ tone: "warning", title: "Tersimpan di perangkat", message: "Sinkronisasi akun belum tersedia." });
    }
  };

  const handleTheme = (t: AppearanceTheme) => {
    setTheme(t);
    const label = THEME_OPTIONS.find((o) => o.value === t)?.label ?? t;
    announceLiveRegion(`Tema: ${label}.`);
  };

  const handleTextSize = (ratio: number) => {
    setTextSize(ratio);
    const label = TEXT_SIZES.find((s) => s.ratio === ratio)?.label ?? "Normal";
    announceLiveRegion(`Ukuran teks: ${label}.`);
    document.documentElement.style.fontSize = `${ratio * 16}px`;
  };

  const handleHighContrast = () => {
    toggleHighContrast();
    announceLiveRegion(settings.highContrast ? "Kontras tinggi nonaktif." : "Kontras tinggi aktif.");
  };

  const handleReduceMotion = () => {
    toggleReduceMotion();
    announceLiveRegion(settings.reduceMotion ? "Animasi normal." : "Animasi dikurangi.");
  };

  /* ── render ── */
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-6">
      {/* Page title */}
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-black leading-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Profil, tampilan, dan preferensi</p>
        </div>
      </div>

      {/* ═══ AKUN ═══ */}
      <SectionTitle>Akun</SectionTitle>

      {/* loading=true hanya saat TIDAK ada cache sama sekali (first time visitor) */}
      {loading && !user ? (
        <SettingCard>
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <span className="block h-4 w-32 animate-pulse rounded bg-muted" />
                <span className="block h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </SettingCard>
      ) : user ? (
        /* ── Logged in ── */
        <>
          {/* Admin badge */}
          {user.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="mb-3 flex items-center gap-3 rounded-20 border border-primary/40 bg-primary-soft p-4 transition-colors hover:bg-primary-soft/80"
            >
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-primary">Admin pengasuh</p>
                <p className="text-xs text-muted-foreground">Buka dashboard moderasi</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
          ) : null}

          <SettingCard>
            {/* Avatar + nama */}
            <div className="flex items-center gap-3 py-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground">
                {(user.displayName ?? user.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold">{user.displayName ?? "–"}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* Edit nama */}
            <form onSubmit={saveName} className="py-4">
              <div className="flex gap-2">
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
              </div>
            </form>

            {/* Quick links */}
            <Link
              href="/saved"
              className="flex items-center gap-3 py-4 text-sm transition-colors hover:text-primary"
            >
              <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">Tempat Tersimpan</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>

            <Link
              href="/report"
              className="flex items-center gap-3 py-4 text-sm transition-colors hover:text-primary"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">Buat Laporan Baru</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>

            {/* Logout */}
            <div className="py-4">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-3 text-sm text-danger transition-colors hover:text-danger"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Keluar dari akun</span>
              </button>
            </div>
          </SettingCard>
        </>
      ) : (
        /* ── Guest ── */
        <SettingCard>
          <div className="py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold">Belum masuk</p>
                <p className="text-sm text-muted-foreground">
                  Masuk untuk simpan profil dan laporan
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-14 border border-border bg-background py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Masuk
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-14 bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Daftar
              </Link>
            </div>
          </div>
        </SettingCard>
      )}

      {/* ═══ PROFIL AKSESIBILITAS ═══ */}
      <SectionTitle>Profil aksesibilitas</SectionTitle>
      <SettingCard>
        <div className="py-3">
          <p className="mb-3 text-sm text-muted-foreground">
            Pilih siapa kamu — BLINDSPOT menyesuaikan rute, peringatan, dan tampilan untukmu.
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
                    "flex w-full items-center gap-3 rounded-16 border-2 px-4 py-3 text-left transition-all",
                    "focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-12",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <choice.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-bold leading-tight", active && "text-primary")}>
                      {choice.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {choice.tagline}
                    </span>
                  </span>
                  {/* Checkmark */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SettingCard>

      {/* ═══ TAMPILAN ═══ */}
      <SectionTitle>Tampilan</SectionTitle>

      {/* Tema */}
      <div className="mb-3">
        <p className="mb-2 px-1 text-sm font-medium text-muted-foreground">Tema</p>
        <div
          role="radiogroup"
          aria-label="Pilih tema tampilan"
          className="grid grid-cols-3 gap-2"
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
                  "flex flex-col items-center gap-1.5 rounded-16 border-2 py-3 text-xs font-semibold transition-all",
                  "focus-visible:outline-offset-2 active:scale-95",
                  sel
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ukuran teks */}
      <SettingCard>
        <div className="py-4">
          <p className="mb-3 text-sm font-medium">Ukuran teks</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Perkecil teks"
              onClick={() => {
                const i = TEXT_SIZES.findIndex((s) => s.ratio === settings.textSize);
                if (i > 0) handleTextSize(TEXT_SIZES[i - 1].ratio);
              }}
              disabled={settings.textSize <= TEXT_SIZES[0].ratio}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-1.5">
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
                      "flex-1 rounded-10 py-2 text-xs font-semibold transition-all active:scale-95",
                      sel
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-primary-soft hover:text-primary",
                    )}
                  >
                    <span aria-hidden="true" style={{ fontSize: `${ratio}em` }}>
                      Aa
                    </span>
                    <span className="sr-only">{label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="Perbesar teks"
              onClick={() => {
                const i = TEXT_SIZES.findIndex((s) => s.ratio === settings.textSize);
                if (i < TEXT_SIZES.length - 1) handleTextSize(TEXT_SIZES[i + 1].ratio);
              }}
              disabled={settings.textSize >= TEXT_SIZES[TEXT_SIZES.length - 1].ratio}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {TEXT_SIZES.find((s) => s.ratio === settings.textSize)?.label ?? "Normal"}
          </p>
        </div>

        {/* High contrast */}
        <SettingRow
          icon={Contrast}
          label="Kontras tinggi"
          description="Mempertegas batas dan teks"
        >
          <Toggle
            checked={settings.highContrast}
            onChange={handleHighContrast}
            label={`Kontras tinggi: ${settings.highContrast ? "aktif" : "nonaktif"}`}
          />
        </SettingRow>

        {/* Reduce motion */}
        <SettingRow
          icon={Minimize2}
          label="Kurangi animasi"
          description="Minimalkan efek gerak"
        >
          <Toggle
            checked={settings.reduceMotion}
            onChange={handleReduceMotion}
            label={`Kurangi animasi: ${settings.reduceMotion ? "aktif" : "nonaktif"}`}
          />
        </SettingRow>
      </SettingCard>

      {/* ═══ AUDIO ═══ */}
      <SectionTitle>Audio & suara</SectionTitle>
      <SettingCard>
        <div className="py-4">
          <div className="mb-3 flex items-center gap-2">
            <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Kontrol panduan suara</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Panduan suara bawaan BLINDSPOT. Tidak menggantikan TalkBack/VoiceOver — keduanya
            dapat berjalan bersamaan.
          </p>
          <AudioControl />
        </div>
      </SettingCard>

      {/* ═══ LAPORAN SAYA ═══ */}
      {user ? (
        <>
          <SectionTitle>Laporan saya</SectionTitle>
          <MyReports />
        </>
      ) : null}

      {/* ═══ POIN & LENCANA ═══ */}
      <SectionTitle>Poin & lencana</SectionTitle>
      <div className="rounded-20 border border-border bg-card shadow-soft">
        <div className="px-4 py-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Setiap laporan hambatan memberi poin. Berfungsi tanpa harus masuk.
          </p>
          <GamificationSummary />
        </div>
      </div>

      {/* ═══ TENTANG ═══ */}
      <SectionTitle>Tentang</SectionTitle>
      <SettingCard>
        <SettingRow label="BLINDSPOT" description="Navigate Beyond Barriers · v0.1.0">
          <span className="text-xs text-muted-foreground">Demo</span>
        </SettingRow>
        <div className="py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Data aksesibilitas bersumber dari komunitas. BLINDSPOT tidak menjamin kondisi
            sebenarnya di lapangan — selalu verifikasi sebelum berangkat.
          </p>
        </div>
      </SettingCard>

      {/* Bottom spacer for mobile bottom nav */}
      <div className="h-4" aria-hidden="true" />
    </div>
  );
}
