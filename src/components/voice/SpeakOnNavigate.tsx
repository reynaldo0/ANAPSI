"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { announceLiveRegion } from "@/lib/announcement";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { isDisabilityUserType } from "@/lib/constants";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { AudioPriority } from "@/types";

const PAGE_LABELS: [string, string][] = [
  ["/chatbot", "Chatbot tunanetra. Bicara atau ketik pesan."],
  ["/community", "Halaman Komunitas. Laporan warga di sekitarmu."],
  ["/journey", "Perjalanan aktif. Ikuti petunjuk suara."],
  ["/map", "Peta 3D ANAPSI. Gunakan kolom pencarian atau suara."],
  ["/onboarding", "Pengaturan awal. Pilih pengalamanmu."],
  ["/profile", "Profil dan pengaturan akun."],
  ["/report", "Halaman Lapor Hambatan. Ketik, bicara, atau foto."],
  ["/route", "Cari rute aksesibel."],
  ["/saved", "Tempat favoritmu."],
  ["/search", "Hasil pencarian."],
  ["/settings", "Pengaturan aplikasi."],
  ["/tutorial", "Tutorial cara pakai ANAPSI."],
  ["/assistant", "Asisten aksesibilitas."],
];

function labelForPath(pathname: string): string {
  for (const [pattern, label] of PAGE_LABELS) {
    if (pathname === pattern) return label;
  }
  if (pathname.startsWith("/report/")) return "Detail laporan di komunitas.";
  if (pathname.startsWith("/places/")) return "Detail tempat di peta ANAPSI.";
  if (pathname === "/login") return "Halaman masuk akun.";
  if (pathname === "/register") return "Halaman daftar akun.";
  if (pathname === "/admin") return "Panel admin.";
  if (pathname === "/") return "Halaman utama ANAPSI. Pilih menu untuk peta, lapor, atau komunitas.";
  const clean = pathname.replace(/[/-]/g, " ").trim();
  return `Halaman ${clean}`;
}

/** Membacakan judul halaman & menu saat pengguna disabilitas berpindah halaman. */
export function SpeakOnNavigate() {
  const pathname = usePathname();
  const { userType, ready } = useAccessibilityProfile();
  const audio = useAudioManager();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (prevRef.current === null) {
      prevRef.current = pathname;
      return;
    }
    const prev = prevRef.current;
    prevRef.current = pathname;
    if (prev === pathname) return;
    if (!isDisabilityUserType(userType)) return;

    const text = labelForPath(pathname);
    announceLiveRegion(text, { assertive: true });
    if (audio.supported) audio.speak(text, AudioPriority.UserRequestedInformation);
  }, [pathname, userType, ready, audio]);

  return null;
}