# ANAPSI

**Peta aksesibilitas dan asisten perjalanan untuk tunanetra dan pengguna kursi roda.**

ANAPSI adalah platform web yang membantu penyandang disabilitas di Indonesia — terutama
tunanetra dan pengguna kursi roda — untuk mengetahui kondisi aksesibilitas suatu tempat
**sebelum dan selama perjalanan**, sehingga mereka dapat mengambil keputusan dengan lebih
mandiri.

---

## Latar Belakang

Bagi teman-teman tunanetra dan pengguna kursi roda, pertanyaan yang paling sering muncul
sebelum bepergian bukanlah "ke mana", melainkan:

1. **Apakah tempat tujuan saya dapat diakses?**
2. **Hambatan apa yang mungkin saya temui di sana?**
3. **Apa pilihan terbaik yang bisa saya lakukan sekarang?**

Informasi ini hampir tidak pernah tersedia, dan ketika tersedia biasanya tidak dalam bentuk
yang bisa diakses (peta visual biasa, teks kecil, tanpa dukungan layar / suara). Akibatnya
perjalanan yang seharusnya mudah sering berubah menjadi tebak-tebakan.

ANAPSI menjawabnya dengan satu pengalaman terpadu: memilih kebutuhan aksesibilitas,
mencari/menyebutkan tujuan, mendapatkan penilaian aksesibilitas beserta hambatan yang mungkin
ada, menerima rekomendasi rute, informasi selama perjalanan, dan melaporkan kondisi baru agar
data komunitas terus membaik.

## Fitur Utama

- **Profil aksesibilitas personal** — pilih kebutuhan (navigasi visual / kursi roda), seluruh
  aplikasi menyesuaikan skor, layer peta, dan rekomendasi.
- **Peta aksesibilitas 3D (MapLibre)** — lokasi tempat, hambatan, dan fasilitas dengan daftar
  alternatif yang mudah diakses (bukan hanya peta visual).
- **Skor aksesibilitas per tempat** — penilaian jelas, per-entrance, beserta faktor pendukung &
  penghambat sesuai profil.
- **Perencanaan rute** — rekomendasi rute dengan peringatan hambatan di sepanjang jalur dan
  navigasi yang diumumkan via suara.
- **Laporan komunitas** — lapor hambatan/fasilitas dengan foto & verifikasi sesama pengguna.
- **Asisten suara (AI)** — chatbot + perintah suara; input bisa **berbicara** atau **mengetik**.
- **Audio berbicara (TTS)** — suara jelas, mengutamakan suara pria, tanpa delay; selalu bisa
  diputar/diulang/dihentikan dan tidak bertabrakan dengan screen reader (TalkBack).
- **Aksesibilitas total** — semantic HTML, fokus yang logis, live announcements, kontras tinggi,
  struktur untuk screen reader dari awal hingga akhir.
- **Berjalan offline** — Service Worker untuk mode peta/tempat penting.
- **Modul tutorial (onboarding)** — orientasi singkat yang juga ramah pembaca layar.
- **Dashboard admin** — ringkasan, moderasi laporan, dan manajemen pengguna.

## Teknologi

| Lapisan        | Teknologi                                                      |
| -------------- | -------------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MapLibre GL |
| TTS / STT      | Web Speech API (speechSynthesis) + webkitSpeechRecognition     |
| AI             | Groq SDK (opsional; dictionary & parser lokal sebagai fallback)|
| Backend        | Go 1.26 · migrasi skema otomatis saat boot                     |
| Database       | MySQL 8.4 (local) / Docker volume persisten (produksi)         |
| Deployment     | Docker Compose · Caddy (HTTPS otomatis)                        |

## Struktur Repository

```
├── src/                 # Frontend Next.js (App Router)
│   ├── app/             #   halaman & route API
│   ├── components/      #   komponen UI
│   └── lib/             #   state, audio, voice, data, utils
├── backend/             # API Go (server backend)
│   ├── cmd/server/      #   entrypoint
│   └── internal/        #   httpapi, service, database, demo, model…
├── deploy/              # Docker Compose, Caddyfile, Dockerfile, .env.example
├── docs/                # Dokumentasi internal (lokal, tidak di-versioning)
└── public/              # Aset statis & service worker (PWA offline)
```

## Menjalankan Secara Lokal

### 1. Frontend

```bash
npm install
npm run dev        # http://localhost:3000
```

### 2. Backend + Database

Butuh MySQL yang kedua `database = anapsi` (skema dibuat otomatis saat boot dengan data demo).

```bash
cd backend
# contoh DSN pada Linux/macOS:
export MYSQL_DSN='user:pass@tcp(127.0.0.1:3306)/anapsi?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci'
export AUTH_SECRET="$(openssl rand -hex 32)"
export APP_ORIGINS=http://localhost:3000
go run ./cmd/server    # API di :8080
```

Variabel yang didukung: `AUTH_SECRET`, `MYSQL_DSN`, `PORT`, `APP_ORIGINS`,
`COOKIE_SECURE`, `TRUST_PROXY_HEADERS`, `GROQ_API_KEY` (opsional), dan tuning pool DB.

> Frontend meng-proxy `/api/*` ke backend, jadi cukup buka `localhost:3000`.

## Deployment

Lihat **`docs/DEPLOY.md`** untuk panduan lengkap (VPS + Caddy + Docker Compose + zero-downtime
upgrade). Ringkasnya:

```bash
cd deploy
cp .env.example .env   # isi AUTH_SECRET, password MySQL, APP_ORIGINS
docker compose up -d --build
```

## Dokumentasi Internal

Seluruh dokumen desain, kebutuhan, dan roadmap disimpan di folder `docs/` (lokal, tidak
di-versioning):

| File             | Isi                                                         |
| ---------------- | ----------------------------------------------------------- |
| `MAIN.md`        | Tujuan akhir & North Star product                           |
| `REQUIREMENT.md` | Fitur & functional requirements                             |
| `DESIGN.md`      | UI/UX, design system, dan implementasi                      |
| `TALKBACK.md`    | Aksesibilitas TalkBack & screen reader                       |
| `ROADMAP.md`     | Status pelacakan implementasi                               |
| `DEPLOY.md`      | Deployment VPS produksi                                     |
| `TUTORIAL.md`    | Panduan pengembangan/opsional                                |

## Status

Aplikasi berjalan penuh sebagai demonstrasi fungsional (demo data tersemai otomatis saat
backend boot): peta, penilaian aksesibilitas per profil, rute, laporan komunitas, asisten
suara, admin, dan PWA offline. Detail status per fitur ada di `docs/ROADMAP.md`.

---

Dibangun dengan fokus pada satu hal: **informasi aksesibilitas yang benar-benar membantu
pengguna disabilitas membuat keputusan perjalanan dengan lebih mandiri.**