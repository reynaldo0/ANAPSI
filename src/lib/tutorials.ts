export type TourFeature = "home" | "report" | "map" | "profile";

export interface TourIntro {
  title: string;
  text: string;
}

export interface TourStep {
  /** CSS selector from data-tour attribute, e.g. "[data-tour=home-map]" */
  target: string;
  title: string;
  text: string;
}

export interface TourConfig {
  feature: TourFeature;
  /** Path tempat tutorial auto-mulai untuk fitur ini */
  path: string;
  label: string;
  storageKey: string;
  intro: TourIntro;
  steps: readonly TourStep[];
}

const P = "blindspot:tour";
export const TOUR_STORAGE_PREFIX = P;

export const FEATURE_TOURS: Record<TourFeature, TourConfig> = {
  home: {
    feature: "home",
    path: "/",
    label: "Beranda",
    storageKey: `${P}:home`,
    intro: {
      title: "Kenalan dengan ANAPSI",
      text: "Cari tempat, dengarkan skor aksesibilitas, dan laporkan hambatan. Kupandu lewat fitur-fiturnya sebentar saja — atau lewati dan langsung menjelajah.",
    },
    steps: [
      {
        target: "[data-tour=home-map]",
        title: "Jelajahi Peta 3D",
        text: "Ini pintu masuk utama. Tekan Jelajahi Peta 3D untuk membuka peta interaktif tempat dan fasilitas terdekat.",
      },
      {
        target: "[data-tour=home-search]",
        title: "Cari tempat",
        text: "Ketik nama tempat atau alamat untuk langsung menuju lokasinya. Hasilnya diumumkan lewat suara.",
      },
      {
        target: "[data-tour=bottomnav]",
        title: "Navigasi bawah",
        text: "Berpindah antarbagian: Beranda, Peta, Lapor, Komunitas, dan Profil selalu tersedia di bawah layar.",
      },
      {
        target: "[data-tour=voice]",
        title: "Suara dua arah",
        text: "Tekan mikrofon di kiri bawah lalu ucapkan, contohnya Buka peta atau Rute ke halte. Jawaban dibacakan kembali.",
      },
      {
        target: "[data-tour=report]",
        title: "Lapor hambatan",
        text: "Lihat trotoar rusak atau elevator mati? Laporkan dari sini — bisa anonim, tanpa masuk, dan tetap mendapat poin.",
      },
    ],
  },
  report: {
    feature: "report",
    path: "/report",
    label: "Laporan",
    storageKey: `${P}:report`,
    intro: {
      title: "Kenalan dengan Laporan",
      text: "Di sini kamu bisa membuat dan memantau laporan hambatan dengan mudah — bahkan tanpa masuk. Pilih cara melapor lalu isi formulirnya.",
    },
    steps: [
      {
        target: "[data-tour=report-method]",
        title: "Pilih cara melapor",
        text: "Pilih Ketik untuk formulir manual, Bicara untuk mendikte, atau Foto. Pilih salah satu dulu agar formulir muncul di bawahnya.",
      },
      {
        target: "[data-tour=report-category]",
        title: "Pilih kategori",
        text: "Kategori membuat laporan mudah diproses komunitas, misalnya ramp rusak atau trotoar rusak.",
      },
      {
        target: "[data-tour=report-location]",
        title: "Lokasi kejadian",
        text: "Tambahkan alamat atau gunakan tombol lokasi saat ini agar laporan mudah ditemukan.",
      },
      {
        target: "[data-tour=report-submit]",
        title: "Kirim laporan",
        text: "Setelah data lengkap, lanjutkan tinjauan lalu kirim lewat tombol ini. Laporan langsung masuk ke komunitas.",
      },
    ],
  },
  map: {
    feature: "map",
    path: "/map",
    label: "Peta",
    storageKey: `${P}:map`,
    intro: {
      title: "Kenalan dengan Peta",
      text: "Peta 3D menampilkan tempat dan fasilitas di sekitarmu. Ada juga tombol Daftar yang membacakan semuanya sebagai teks.",
    },
    steps: [
      {
        target: "[data-tour=map-canvas]",
        title: "Kanvas peta 3D",
        text: "Peta ini bisa dijelajah dengan sentuh, keyboard, atau suara. Pilih tempat untuk melihat skor aksesibilitasnya.",
      },
      {
        target: "[data-tour=map-tools]",
        title: "Cari, filter, dan lokasi",
        text: "Ketik nama tempat, pilih layer fasilitas, atau tekan Lokasi saya untuk memusatkan peta ke posisimu.",
      },
      {
        target: "[data-tour=map-list]",
        title: "Daftar sebagai teks",
        text: "Peta sulit dibaca? Tekan Daftar di kanan atas — semua informasi tersedia sebagai teks untuk screen reader dan keyboard.",
      },
    ],
  },
  profile: {
    feature: "profile",
    path: "/profile",
    label: "Profil",
    storageKey: `${P}:profile`,
    intro: {
      title: "Kenalan dengan Profil",
      text: "Profil aksesibilitas mengubah cara aplikasi berbicara, memilih rute, dan mengatur tombol untukmu.",
    },
    steps: [
      {
        target: "[data-tour=profile-switcher]",
        title: "Kamu siapa?",
        text: "Pilih pengalamanmu: tanpa disabilitas, tunanetra, atau tunadaksa. Tidak wajib masuk.",
      },
      {
        target: "[data-tour=profile-gamification]",
        title: "Poin & lencana",
        text: "Setiap laporan fasilitas rusak memberi poin dan membuka lencana baru. Berfungsi tanpa login.",
      },
      {
        target: "[data-tour=profile-reports]",
        title: "Laporan saya",
        text: "Pantau laporan yang kamu kirim beserta status dan verifikasinya di sini.",
      },
    ],
  },
};

/** Cari konfigurasi tutorial untuk sebuah path (auto-start). */
export function tourForPath(pathname: string): TourConfig | null {
  return (
    Object.values(FEATURE_TOURS).find((tour) =>
      tour.path === "/" ? pathname === "/" : pathname === tour.path || pathname.startsWith(`${tour.path}/`),
    ) ?? null
  );
}

export function tourSeen(config: TourConfig): boolean {
  try {
    return localStorage.getItem(config.storageKey) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(config: TourConfig): void {
  try {
    localStorage.setItem(config.storageKey, "1");
  } catch {
    // penyimpanan tidak tersedia — abaikan
  }
}