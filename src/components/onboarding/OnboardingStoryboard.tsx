"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { announceLiveRegion } from "@/lib/announcement";
import { AudioPriority } from "@/types";
import type { UserType } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface Frame {
  icon: string;
  title: string;
  body: string;
}

const VISUAL_FRAMES: Frame[] = [
  {
    icon: "👋",
    title: "Selamat datang, ANAPSI adalah navigator suaramu",
    body: "Setiap halaman punya tombol yang bisa dibacakan. Tekan tombol mikrofon besar lalu bicara — aplikasi menjawab lewat suara.",
  },
  {
    icon: "🎤",
    title: "Komando suara dua arah",
    body: "Tekan mikrofon di kiri bawah, lalu ucapkan: Cari halte, Buka peta, Rute ke masjid, atau Laporkan. Aplikasi mengerjakan dan membacakan jawabannya.",
  },
  {
    icon: "🔊",
    title: "Dengarkan halaman",
    body: "Tombol Dengerkan Suara ada di hampir semua halaman: telepon peta, daftar tempat, dan deskripsi lokasi semuanya bisa dibacakan.",
  },
  {
    icon: "😲",
    title: "Akses",
    body: "Lewat perangkat keras atau layar: Tab untuk berpindah, Enter untuk memilih, dan Esc untuk menutup.",
  },
  {
    icon: "🤖",
    title: "Chatbot suara",
    body: "Tombol Bot di kanan bawah membuka chatbot. Tekan mikrofon, bicara, dan jawabannya dibacakan. Khusus untukmu.",
  },
  {
    icon: "🚶",
    title: "Perjalanan dengan suara",
    body: "Saat rute dimulai, petunjuk belok dibacakan langkah demi langkah, dan ada getaran saat mendekati hambatan.",
  },
];

const WHEELCHAIR_FRAMES: Frame[] = [
  {
    icon: "👋",
    title: "Selamat datang, ANAPSI memprioritaskan kursi roda",
    body: "Semua rute memprioritaskan jalur bebas tangga, ramp, dan pintu lebar. Tombol besar agar mudah ditekan.",
  },
  {
    icon: "🧭",
    title: "Cari rute kursi roda",
    body: "Halaman Cari Rute menghindari tangga dan menyebutkan lebar pintu, ketersediaan ramp, dan elevator.",
  },
  {
    icon: "🗺️",
    title: "Peta dan daftar tempat",
    body: "Peta 3D bisa dijelajah dengan keyboard atau layar sentuh. Ada daftar tempat terdekat sebagai alternatif.",
  },
  {
    icon: "🚧",
    title: "Laporkan hambatan",
    body: "Trotoar rusak, ramp rusak, elevator mati — lapor sekali sentuh. Komunitas memverifikasi laporanmu.",
  },
  {
    icon: "♿",
    title: "Skor aksesibilitas",
    body: "Setiap tempat memiliki skor aksesibilitas. Pilih yang hijau untuk perjalanan paling nyaman.",
  },
  {
    icon: "💡",
    title: "Tombol besar dan tampilan",
    body: "Semua tombol berukuran 48 piksel atau lebih. Kontras tinggi bisa diaktifkan di pengaturan.",
  },
];

function getFrames(profile: UserType | null): Frame[] {
  if (profile === "WHEELCHAIR_MOBILITY") return WHEELCHAIR_FRAMES;
  if (profile === "VISUAL_NAVIGATION") return VISUAL_FRAMES;
  if (profile === "NON_DISABLED") return STANDARD_FRAMES;
  return VISUAL_FRAMES;
}

function blankFrame(): Frame {
  return { icon: "👋", title: "Pilih profil untuk mulai", body: "Pilih profil terdahulu sebelum tutorial." };
}

const STANDARD_FRAMES: Frame[] = [
  {
    icon: "👋",
    title: "Selamat datang di ANAPSI",
    body: "Temukan tempat aksesibel dan laporkan hambatan untuk membantu temanmu yang tunanetra atau pengguna kursi roda.",
  },
  {
    icon: "🗺️",
    title: "Jelajahi peta",
    body: "Peta 3D menampilkan fasilitas dan hambatan secara langsung. Gunakan tombol Peta untuk melihat dan Daftar untuk tempat terdekat.",
  },
  {
    icon: "🚧",
    title: "Laporkan hambatan",
    body: "Lihat trotoar rusak, ramp rusak, atau elevator mati? Laporkan lewat menu Lapor—bisa anonim, tanpa harus masuk.",
  },
  {
    icon: "✅",
    title: "Verifikasi laporan",
    body: "Bantu perbarui kondisi: masih akurat, kondisi berubah, atau sudah diperbaiki. Setiap kontribusi dihitung.",
  },
  {
    icon: "🏅",
    title: "Poin dan lencana",
    body: "Setiap laporan fasilitas rusak memberi poin dan lencana. Berbahaya atau disertai foto = poin lebih banyak.",
  },
  {
    icon: "🤝",
    title: "Mari bantu sesama",
    body: "Masuk untuk menyimpan profil dan riwayat, atau tetap anonim—semua kontribusi tetap masuk ke sistem.",
  },
];

interface OnboardingStoryboardProps {
  profile: UserType | null;
  /** Bacakan setiap bingkai secara otomatis (untuk profil tunanetra) */
  autoSpeak?: boolean;
}

export function OnboardingStoryboard({ profile, autoSpeak = true }: OnboardingStoryboardProps) {
  const audio = useAudioManager();
  const frames = useMemo(() => getFrames(profile), [profile]);
  const [index, setIndex] = useState(0);
  const frame = profile ? frames[index] : blankFrame();

  const asSentence = (f: Frame) => `${f.title}. ${f.body}`;

  const speakFrame = useCallback(
    (f: Frame) => {
      audio.speak(asSentence(f), AudioPriority.UserRequestedInformation);
      announceLiveRegion(asSentence(f), { assertive: true });
    },
    [audio],
  );

  const speakAll = useCallback(() => {
    for (const f of frames) {
      audio.speak(asSentence(f), AudioPriority.UserRequestedInformation);
    }
  }, [audio, frames]);

  useEffect(() => {
    if (!profile || !autoSpeak || profile !== "VISUAL_NAVIGATION") return;
    const t = setTimeout(() => speakFrame(frames[index]), 350);
    return () => clearTimeout(t);
  }, [index, autoSpeak, profile, frames, speakFrame]);

  if (!profile) {
    return (
      <p className="rounded-16 border-2 border-border bg-card p-5 text-muted-foreground">
        Pilih profil dahulu agar tutorial menyesuaikan kebutuhanmu.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground">
          Tutorial {index + 1} dari {frames.length}
        </p>
        <button
          type="button"
          onClick={speakAll}
          className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-border bg-card px-4 text-sm font-bold hover:bg-muted"
        >
          <Play className="h-4 w-4" aria-hidden="true" /> Putar semua
        </button>
      </div>

      <article
        aria-live="assertive"
        aria-label="Langkah tutorial"
        className={cn(
          "flex min-h-[210px] flex-col gap-4 rounded-24 border-2 border-border bg-card p-6 shadow-card card-elevated",
        )}
      >
        <span aria-hidden="true" className="text-5xl leading-none">{frame.icon}</span>
        <div>
          <h3 className="text-h2 font-black text-primary">{frame.title}</h3>
          <p className="mt-2 text-base leading-relaxed">{frame.body}</p>
        </div>
        <button
          type="button"
          onClick={() => speakFrame(frame)}
          aria-label={`Dengarkan: ${frame.title}`}
          className="mt-auto inline-flex h-12 items-center gap-2 self-start rounded-full primary-solid px-5 font-black text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Volume2 className="h-5 w-5" aria-hidden="true" /> Dengarkan
        </button>
      </article>

      <div
        className="flex items-center justify-center gap-1"
        role="group"
        aria-label="Langkah tutorial"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = event.key === "ArrowRight" ? Math.min(index + 1, frames.length - 1) : Math.max(index - 1, 0);
          setIndex(next);
          announceLiveRegion(`Langkah ${next + 1}: ${frames[next].title}`);
          document.getElementById(`onboard-step-${next}`)?.focus();
        }}
      >
        {frames.map((f, i) => (
          <button
            key={f.title}
            id={`onboard-step-${i}`}
            type="button"
            tabIndex={i === index ? 0 : -1}
            onClick={() => { setIndex(i); announceLiveRegion(`Langkah ${i + 1}: ${f.title}`); }}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Langkah ${i + 1}: ${f.title}`}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-offset-2",
              i === index ? "bg-primary text-primary-foreground shadow-card" : "bg-muted text-muted-foreground hover:bg-muted-foreground/25",
            )}
          >
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", i === index ? "bg-current" : "bg-current opacity-60")} />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex h-12 items-center rounded-full border-2 border-border bg-card px-6 font-bold disabled:opacity-40"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={() => index < frames.length - 1 && setIndex(index + 1)}
          disabled={index === frames.length - 1}
          className="inline-flex h-12 items-center rounded-full primary-solid px-8 font-black text-primary-foreground shadow-soft disabled:opacity-40"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}