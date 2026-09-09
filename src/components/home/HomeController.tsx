"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Accessibility, Bot, BookOpen, Compass, Map as MapIcon, Megaphone, Navigation2, Sparkles, Volume2 } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { announceLiveRegion } from "@/lib/announcement";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { ACCESSIBILITY_PROFILES, ONBOARDING_CHOICES } from "@/lib/constants";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAuth } from "@/lib/state/AuthContext";
import { AudioPriority } from "@/types";
import type { PlaceSummary } from "@/types";

export function HomeController() {
  const router = useRouter();
  const { userType } = useAccessibilityProfile();
  const { user } = useAuth();
  const audio = useAudioManager();
  const [nearby, setNearby] = useState<PlaceSummary[]>([]);
  const profileMeta = ACCESSIBILITY_PROFILES.find((p) => p.value === userType);
  const choiceMeta = ONBOARDING_CHOICES.find((c) => c.value === userType);
  const isBlind = userType === "VISUAL_NAVIGATION";

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch("/api/places", { cache: "no-store" });
        const b = (await r.json()) as { data: { places: PlaceSummary[] } };
        if (!c) setNearby(b.data.places.slice(0, 4));
      } catch {}
    })();
    return () => { c = true; };
  }, []);

  const speakWelcome = () => {
    const text = `Selamat datang di BLINDSPOT. ${user ? `Halo ${user.displayName}.` : ""} ${userType === "NON_DISABLED" ? "Kamu memilih pengalaman standar, bantu komunitas melaporkan hambatan. " : `Profil aktif ${profileMeta?.label ?? "belum dipilih"}. `}${isBlind ? "Tekan mikrofon di kiri bawah untuk komando suara. " : ""} Gunakan Jelajahi Peta 3D untuk mulai, atau baca Cara Pakai untuk tutorial singkat.`;
    audio.speak(text, AudioPriority.UserRequestedInformation);
    announceLiveRegion(text, { assertive: true });
  };

  const search = (q: string) => {
    announceLiveRegion(`Mencari ${q}`);
    router.push(`/map?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero panel — modern gradasi */}
      <section aria-labelledby="hero-heading" className="rounded-24 border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-primary/60 bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary">
              {choiceMeta ? <choiceMeta.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Accessibility className="h-4 w-4 shrink-0" aria-hidden="true" />} {
                isBlind ? "Mode Tunanetra — Panduan Suara"
                : userType === "WHEELCHAIR_MOBILITY" ? `Mode ${profileMeta?.label}`
                : userType === "NON_DISABLED" ? "Mode Standar — Bantu Komunitas"
                : "Pilih pengalamanmu"
              }
            </p>
            <button type="button" onClick={speakWelcome} aria-label="Dengarkan penjelasan halaman" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow-card hover:bg-primary hover:text-primary-foreground">
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <h1 id="hero-heading" className="text-[2.4rem] font-black leading-[1.02] tracking-tight">
            Navigasi <span className="text-grad">Tanpa Hambatan</span>
          </h1>
          <p className="text-lg leading-relaxed text-foreground/90">
            {user ? `Halo, ${user.displayName}.` : "Halo, teman BLINDSPOT."} Cari tempat, dengarkan skor aksesibilitas, dan buat rute aman — semuanya bisa lewat keyboard dan suara.
          </p>
          {choiceMeta ? (
            <p className="inline-flex items-center gap-2 self-start rounded-full border-2 border-border bg-background/60 px-4 py-2 text-sm font-bold">
              <choiceMeta.icon className="h-4 w-4 text-primary" aria-hidden="true" /> {choiceMeta.tagline}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/onboarding" className="inline-flex h-13 items-center gap-2 rounded-full primary-solid px-6 py-3 font-black text-primary-foreground shadow-card hover:opacity-90">
                <Accessibility className="h-5 w-5" aria-hidden="true" /> Pilih pengalamanmu (2 detik)
              </Link>
              <Link href="/tutorial" className="inline-flex h-13 items-center gap-2 rounded-full border-2 border-border bg-card px-6 py-3 font-bold hover:bg-muted">
                <BookOpen className="h-5 w-5" aria-hidden="true" /> Cara Pakai
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Cari tempat */}
      <section aria-labelledby="search-heading" data-tour="home-search" className="mt-6 rounded-24 border-2 border-border bg-card p-5 shadow-card">
        <h2 id="search-heading" className="text-h3 font-black">Cari tempat</h2>
        <p className="text-sm text-muted-foreground">Ketik lalu tekan Enter. Hasil diumumkan ke screen reader.</p>
        <div className="mt-3"><SearchInput onSearch={search} label="Cari tempat untuk mulai" placeholder="Contoh: halte, masjid terdekat, rumah sakit" /></div>
      </section>

      {/* Aksi utama — besar, dominan, web-app feel */}
      <nav aria-label="Aksi utama" className="mt-6 grid gap-3">
        <h2 className="sr-only">Aksi cepat</h2>
        <Link href="/map" aria-label="Jelajahi peta 3D" data-tour="home-map" className="group flex h-[72px] items-center gap-4 rounded-24 primary-solid px-6 text-primary-foreground shadow-card hover:opacity-95">
          <MapIcon className="h-8 w-8 shrink-0" aria-hidden="true" />
          <span className="text-lg font-black">Jelajahi Peta 3D</span>
          <span className="ml-auto text-xs font-bold" aria-hidden="true">peta interaktif</span>
        </Link>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/route" aria-label="Cari rute aksesibel" className="flex h-13 items-center justify-center gap-2 rounded-16 border-2 border-border bg-card px-4 py-3 font-bold shadow-soft hover:-translate-y-0.5 hover:shadow-card"><Navigation2 className="h-5 w-5 text-primary" aria-hidden="true" /> Cari Rute</Link>
          <Link href="/report" aria-label="Laporkan hambatan" data-tour="report" className="flex h-13 items-center justify-center gap-2 rounded-16 border-2 border-border bg-card px-4 py-3 font-bold shadow-soft hover:-translate-y-0.5 hover:shadow-card"><Megaphone className="h-5 w-5 text-danger" aria-hidden="true" /> Laporkan</Link>
          <Link href="/assistant" aria-label="Tanya asisten aksesibilitas" className="flex h-13 items-center justify-center gap-2 rounded-16 border-2 border-border bg-card px-4 py-3 font-bold shadow-soft hover:-translate-y-0.5 hover:shadow-card"><Sparkles className="h-5 w-5 text-accent" aria-hidden="true" /> Tanya Asisten</Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/chatbot" aria-label="Chatbot suara Groq untuk tunanetra" className="flex h-14 items-center gap-3 rounded-16 border-2 border-accent bg-accent-soft px-5 font-bold text-accent-foreground shadow-soft hover:bg-accent hover:text-white">
            <Bot className="h-6 w-6" aria-hidden="true" /> Chatbot Suara Groq
          </Link>
          <Link href="/tutorial" aria-label="Cara pakai aplikasi" className="flex h-14 items-center gap-3 rounded-16 border-2 border-border bg-card px-5 font-bold shadow-soft hover:bg-muted">
            <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" /> Cara Pakai
          </Link>
        </div>
      </nav>

      {/* Daftar alternatif peta */}
      <section aria-labelledby="nearby-heading" className="mt-8 rounded-24 border-2 border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 id="nearby-heading" className="text-h3 font-black">Tempat terdekat</h2>
          <Link href="/map" className="inline-flex items-center gap-1 text-sm font-bold text-primary underline-offset-2 hover:underline">
            <Compass className="h-4 w-4" aria-hidden="true" /> Ke peta
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Alternatif peta untuk dibacakan. Gunakan Tab untuk menjelajah.</p>
        <ul className="mt-3 divide-y divide-border" role="list">
          {nearby.map((p) => (
            <li key={p.id}>
              <Link href={`/places/${p.id}`} className="flex items-center justify-between gap-3 rounded-16 px-3 py-3.5 hover:bg-muted focus-visible:outline-offset-2">
                <span className="font-bold">{p.name}</span>
                <span className="shrink-0 rounded-full border-2 border-border bg-muted px-3 py-1 text-xs font-black">{p.category}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 rounded-16 border-2 border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">Web-app modern • Responsif HP & Desktop • Semua bisa pakai keyboard (Tab, Enter, Esc) & suara 2 arah</p>
    </div>
  );
}