# ANAPSI — Fitur & Sistem

> **ANAPSI (Navigate Beyond Barriers)** — platform navigasi aksesibilitas untuk penyandang disabilitas di area Jakarta Timur (fokus: Rawamangun / Pulo Gadung).  
> Stack: Next.js (App Router) + Go backend (MySQL). Data utama berupa data demo; jalur nyata via OSRM + Overpass API.

---

## Daftar Isi

1. [Profil Pengguna & Aksesibilitas](#1-profil-pengguna--aksesibilitas)
2. [Pintasan Kunjungan Pertama (First-Visit Gate)](#2-pintasan-kunjungan-pertama)
3. [Autentikasi & Sesi](#3-autentikasi--sesi)
4. [Peta Interaktif](#4-peta-interaktif)
5. [Sistem Tempat (Places)](#5-sistem-tempat)
6. [Sistem Laporan (Reports)](#6-sistem-laporan)
7. [Verifikasi Komunitas](#7-verifikasi-komunitas)
8. [Pencarian (Search)](#8-pencarian)
9. [Rute & Navigasi Terbimbing (Journey)](#9-rute--navigasi-terbimbing)
10. [Data Realtime (Overpass / OSM)](#10-data-realtime)
11. [Asisten AI (Groq)](#11-asisten-ai)
12. [Chatbot Suara (BlindChatbot)](#12-chatbot-suara)
13. [Text-to-Speech (TTS)](#13-text-to-speech)
14. [Speech-to-Text (STT)](#14-speech-to-text)
15. [Perintah Suara Global](#15-perintah-suara-global)
16. [Bahasa Isyarat (Sign Language)](#16-bahasa-isyarat)
17. [Gamifikasi & Pencapaian](#17-gamifikasi--pencapaian)
18. [Halaman Komunitas](#18-halaman-komunitas)
19. [Tempat Tersimpan (Saved Places)](#19-tempat-tersimpan)
20. [Panel Pengaturan (Settings)](#20-panel-pengaturan)
21. [Panel Admin](#21-panel-admin)
22. [Tutorial & Panduan](#22-tutorial--panduan)
23. [Arsitektur Backend Go](#23-arsitektur-backend-go)
24. [Basis Data (MySQL)](#24-basis-data)
25. [Rate Limiting & Keamanan](#25-rate-limiting--keamanan)

---

## 1. Profil Pengguna & Aksesibilitas

### Apa
Dua profil utama yang menentukan seluruh pengalaman interaksi:

| Profil | Label | Kecepatan Jalan | Ciri Khas UI |
|---|---|---|---|
| `VISUAL_NAVIGATION` | Tunanetra | 5 km/jam | Auto-sukapan, perintah suara, teks besar, haptic |
| `WHEELCHAIR_MOBILITY` | Tunadaksa | 4.5 km/jam | Tombol langkah, panel kondisi rute, ukuran teks normal |
| `NON_DISABLED` | Pengguna Standar | — | UX standar, fokus kontribusi laporan |

### Flow Sistem
1. **Onboarding** → pengguna memilih tipe pengguna → `ProfileContext.setUserType()` disimpan ke `localStorage`.
2. **ProfileContext** (module-level singleton via `useSyncExternalStore`) menjadi single source of truth → dikonsumsi oleh seluruh komponen: peta, rute, TTS, chatbot, journey, asisten.
3. **ProfileSwitcher** di halaman Profil memungkinkan pergantian profil kapan saja → efek langsung ke seluruh UI.
4. Profil dikirim ke backend saat POST `/api/reports` dan POST `/api/routes` → scoring & prioritas berbeda per profil.

### File Kunci
- `src/lib/constants.ts` — definisi `ONBOARDING_CHOICES`, `ACCESSIBILITY_PROFILES`
- `src/lib/state/ProfileContext.tsx` — state global profil
- `src/components/profile/ProfileSwitcher.tsx` — UI pergantian profil

---

## 2. Pintasan Kunjungan Pertama

### Apa
Pengguna baru yang belum memilih profil akan dialihkan otomatis ke halaman onboarding.

### Flow Sistem
1. `AppShell.tsx` memeriksa `ProfileContext.ready` (true setelah hydration) + `userType === null`.
2. Jika keduanya benar dan path bukan `/onboarding`, `/login`, `/register` → redirect ke `/onboarding`.
3. Pengguna yang sudah memiliki profil masuk langsung ke halaman yang diminta.

### File Kunci
- `src/components/layout/AppShell.tsx` — komponen `FirstVisitGate`

---

## 3. Autentikasi & Sesi

### Apa
Sistem registrasi/login email+password dengan sesi HMAC-signed cookie. Juga mendukung akun demo tanpa registrasi.

### Flow Sistem
1. **Register** → POST `/api/auth/register` → hash password (scrypt N=16384) → simpan ke MySQL `users` → set cookie `blindspot_session` (HMAC-SHA256 signed, HttpOnly, SameSite=Lax, TTL 7 hari).
2. **Login** → POST `/api/auth/login` → verifikasi hash → set cookie yang sama.
3. **Logout** → POST `/api/auth/logout` → hapus cookie.
4. **Session check** → GET `/api/auth/me` → decode cookie → return `PublicUser{id, email, displayName, role}`.
5. **Role**: `USER` (default) atau `ADMIN` — ADMIN bisa mengakses panel moderasi.
6. **Akun Demo**: tanpa registrasi, identitas anonim = SHA-256(IP) → `anon:<hash>`. Data disimpan ke `localStorage[blindspot:reporter]`.

### File Kunci
- `backend/auth.go` — hash, sign, verify
- `backend/routes.go` — endpoint auth
- `src/lib/state/AuthContext.tsx` — state sesi di frontend
- `src/app/login/page.tsx`, `src/app/register/page.tsx`

---

## 4. Peta Interaktif

### Apa
Peta 3D menggunakan MapLibre GL JS dengan tile OpenFreeMap. Menampilkan marker tempat, fitur aksesibilitas (11 kategori), garis guiding block dari OSM realtime, dan visualisasi rute.

### Fitur
- **Marker Tempat**: ikon emoji per kategori (Kesehatan, Transportasi, Pendidikan, dll)
- **Fitur Aksesibilitas**: 11 kategori dibagi 2 profil:
  - **Visual**: guiding_block, pedestrian_crossing, audio_crossing_signal, obstacle, surface_hazard
  - **Mobility**: ramp, stairs, elevator, path_width, surface_condition, accessible_entrance
- **Filter per Profil**: toggle menampilkan/sembunyikan fitur berdasarkan profil aktif
- **Garis Guiding Block**: garis kuning dari Overpass API (tactile paving di footway)
- **Pencarian Peta**: input search di peta → filter tempat → fly-to lokasi
- **Klik Marker**: buka detail tempat (`/places/:id`)
- **Fallback SVG**: `MapPanel.tsx` sebagai fallback 2D jika WebGL tidak tersedia
- **Fokus Jakarta Timur**: `FOCUS_CENTER = {lat: -6.196, lng: 106.879}`, radius 3.5 km — semua data dikurasi dalam area ini

### Flow Sistem
1. `MapPageController` fetch `/api/places` → render `Accessible3DMap`
2. `Accessible3DMap` inisialisasi MapLibre → load tile → render markers dari tempat + fitur
3. Klik marker → fetch detail → navigasi ke `/places/:id`
4. Toggle kategori → filter fitur yang ditampilkan
5. GPS aktif → proyeksi posisi ke peta → announce lokasi

### File Kunci
- `src/components/map/Accessible3DMap.tsx` — MapLibre 3D
- `src/components/map/MapPageController.tsx` — koordinasi data + voice
- `src/components/map/MapPanel.tsx` — fallback SVG 2D
- `src/lib/geo.ts` — `FOCUS_CENTER`, `FOCUS_RADIUS_KM`, `focusOrigin()`

---

## 5. Sistem Tempat (Places)

### Apa
Database tempat umum di area Jakarta Timur. Setiap tempat memiliki: nama, alamat, kategori, koordinat, skor aksesibilitas (visual + mobilitas), pintu masuk (entrances), dan laporan terkait.

### Data Demo
6 tempat utama (UNJ, LRT Velodrome, RSUD, Masjid Al-Hikmah, Halte Transjakarta, Perpustakaan) — masing-masing dengan detail pintu masuk, skor, dan data pendukung.

### API Endpoints
| Endpoint | Deskripsi |
|---|---|
| `GET /api/places` | Daftar tempat (filter: `q`, `lat`, `lng`, `radiusKm`) |
| `GET /api/places/{id}` | Detail tempat + pintu masuk + laporan |
| `GET /api/places/{id}/accessibility?profile=` | Evaluasi aksesibilitas per profil |
| `GET /api/places/{id}/entrances` | Daftar pintu masuk + rekomendasi |

### Flow Sistem
1. Frontend fetch `/api/places` → data dari in-memory cache (demo) atau MySQL
2. Klik tempat → `/places/:id` → fetch detail + evaluasi + laporan terkait
3. Skor aksesibilitas = komposisi dari fitur aksesibilitas di sekitar tempat + keberadaan pintu masuk
4. User bisa simpan tempat (`POST /api/saved`) atau buat rute (`POST /api/routes`)

### File Kunci
- `backend/places.go` — handler + evaluasi
- `backend/handlers_places.go` — HTTP handlers
- `backend/demo.go` — data demo 8 tempat
- `src/lib/data/places.ts` — frontend data layer
- `src/app/places/[id]/page.tsx` — halaman detail

---

## 6. Sistem Laporan (Reports)

### Apa
Sistem pelaporan hambatan aksesibilitas oleh pengguna. Mendukung input teks, suara, dan foto. Setiap laporan memiliki status, tingkat keparahan, profil terdampak, dan media.

### Alur Laporan
1. **Pilih Metode**: Tulis / Suara / Foto
2. **Isi Detail**: kategori (STAIRS, DAMAGED_RAMP, BLOCKED_PATH, dll), deskripsi, tingkat keparahan (HIGH/MEDIUM/LOW), profil terdampak (VISUAL/MOBILITY/BOTH)
3. **Review & Kirim**
4. **Dapat Poin Gamifikasi** (badge + poin)

### Kategori Laporan
`STAIRS`, `DAMAGED_RAMP`, `BLOCKED_PATH`, `BROKEN_SURFACE`, `NO_GUIDING_BLOCK`, `NO_AUDIO_SIGNAL`, `NARROW_PATH`, `BROKEN_ELEVATOR`, `SLIPPERY_SURFACE`, `OTHER`

### Status Workflow
```
PENDING → ACTIVE (setelah verifikasi)
ACTIVE → OUTDATED (kondisi berubah)
ACTIVE → RESOLVED (sudah diperbaiki)
PENDING → REJECTED (ditolak admin)
```

### API Endpoints
| Endpoint | Deskripsi |
|---|---|
| `GET /api/reports` | Daftar laporan (filter: `placeId`, `mine`, `profile`) |
| `POST /api/reports` | Buat laporan baru (foto max 3, base64, ≤5MB) |
| `GET /api/reports/{id}` | Detail laporan + media + verifikasi |
| `PUT /api/reports/{id}` | Edit laporan (owner atau admin) |

### Flow Input Suara
1. Aktifkan mode suara → STT mulai mendengarkan
2. Transkrip dianalisis oleh `structureReportTranscript()` → extract kategori, severity, deskripsi
3. Hasil ditampilkan untuk review → pengguna konfirmasi → submit

### Flow Input Foto
1. Pilih foto → metadata (filename, ukuran, MIME) dikirim ke backend
2. Backend analisis filename → saran kategori
3. Hasil ditampilkan untuk review → pengguna isi deskripsi → submit

### File Kunci
- `backend/reports.go` — CRUD + scoring
- `backend/handlers_reports.go` — HTTP handlers
- `src/components/report/ReportFlow.tsx` — wizard laporan
- `src/lib/voice/report-structurer.ts` — analisis transkrip suara
- `src/app/report/[id]/page.tsx` — detail laporan

---

## 7. Verifikasi Komunitas

### Apa
Sistem verifikasi berbasis komunitas untuk memvalidasi akurasi laporan. Pengguna lain bisa mengonfirmasi, mengubah status, atau menandai sudah diperbaiki.

### Aksi Verifikasi
| Aksi | Status Hasil | Label |
|---|---|---|
| CONFIRMED | ACTIVE | "Masih akurat" |
| CHANGED | OUTDATED | "Kondisi berubah" |
| RESOLVED | RESOLVED | "Sudah diperbaiki" |

### Aturan
- Self-verification dilarang (409)
- Duplikat verifikasi dilarang (409)
- Max 30 verifikasi per laporan
- Laporan RESOLVED/REJECTED tidak bisa diverifikasi ulang
- Verifikator mendapat badge `VERIFIED_CONTRIBUTION`

### Flow Sistem
1. Pengguna melihat laporan di `/report/{id}`
2. Klik salah satu aksi verifikasi → POST `/api/reports/{id}/verify|changed|resolved`
3. Backend update status laporan + tambah record verifikasi + update count
4. Author laporan mendapat badge jika laporan terverifikasi

### File Kunci
- `src/components/report/ReportVerification.tsx` — UI verifikasi
- `backend/reports.go` — `loadVerifications()`, handler verify

---

## 8. Pencarian (Search)

### Apa
Pencarian tempat dan laporan dengan integrasi geocoding dan analisis skor.

### Fitur
- **Pencarian Tempat**: filter per kategori, jarak, dan profil
- **Geocoding**: Nominatim API dengan bounded search ke area Jakarta (viewbox `106.79,-6.34,106.99,-6.10`)
- **Skor Analisis**: saran terdekat dilengkapi skor aksesibilitas (`analyzedNear()`)
- **Saran Cepat**: chip Universitas, Puskesmas, Rumah Sakit, Stasiun, Mall
- **Voice Input**: STT untuk pencarian suara

### Flow Sistem
1. Ketik di search bar → debounce 300ms → fetch `/api/places?q=` + `/api/geo/suggest`
2. Hasil ditampilkan dengan badge sumber (Data demo / Geocoding)
3. Klik hasil → `/places/:id`
4. Voice: transkrip dikirim langsung ke search

### File Kunci
- `src/components/search/SearchPage.tsx`
- `src/app/api/geo/suggest/route.ts` — geocoding + scoring
- `src/app/api/places/route.ts` — search places

---

## 9. Rute & Navigasi Terbimbing (Journey)

### Apa
Sistem perencanaan rute dan navigasi langkah demi langkah dengan panduan suara. Dual mode: rute simulasi (demo) dan rute jalan nyata (OSRM).

### Perencanaan Rute
1. Pilih asal (auto-detect GPS atau manual) + tujuan (dari daftar tempat)
2. POST `/api/routes` → backend coba OSRM real routing (8 detik timeout) → fallback ke geometri demo
3. Hasil: max 2 opsi rute (Tercepat / Paling Aksesibel) masing-masing dengan skor, hambatan, fasilitas, langkah

### Navigasi Terbimbing (JourneyController)
1. **Tampilan Ringkasan**: jarak total, estimasi waktu, skor aksesibilitas, daftar hambatan
2. **Navigasi Langkah**: instruksi per langkah dengan nomor, deskripsi, jarak, hambatan, fasilitas

### Fitur Voice Navigation
- **TTS**: setiap instruksi dibacakan otomatis saat langkah berganti
- **STT**: perintah suara — "ulangi instruksi", "hambatan apa", "berapa jauh lagi"
- **Haptic**: pola getar berbeda per aksi (mulai: `[200,100,200]`, tiba: `[100,50,100,50,300]`)
- **Auto-advance**: GPS watchPosition → proyeksi posisi ke polyline → otomatis ganti langkah saat batas terlampaui
- **Arrival detection**: within 8 meter dari tujuan → "Tiba di tujuan"

### Perbedaan UI Per Profil
| Tunanetra | Tunadaksa |
|---|---|
| Teks besar (2rem) | Tombol Prev/Next langkah |
| Auto-step via GPS | Panel kondisi rute |
| Tombol "Hambatan?" + "Berapa jauh?" | Teks normal ukuran |
| Voice command bar | Ringkasan fasilitas |

### Journey Map (MapLibre 3D)
- Garis rute biru + casing putih
- Garis guiding block kuning dari OSM realtime
- Marker titik A (hijau), B (merah), hambatan (kuning), fasilitas (hijau)
- Posisi pengguna: lingkaran biru berkedip
- Follow toggle + center-on-me

### File Kunci
- `src/app/route/page.tsx` — perencanaan rute
- `src/components/route/RoutePlanner.tsx` — form rute
- `src/components/journey/JourneyController.tsx` — navigasi terbimbing
- `src/components/journey/JourneyMap.tsx` — peta rute 3D
- `backend/route_engine.go` — perhitungan rute + OSRM
- `backend/handlers_routes.go` — endpoint rute

---

## 10. Data Realtime

### Apa
Integrasi Overpass API (OpenStreetMap) untuk data aksesibilitas realtime di sekitar lokasi pengguna.

### Fitur
- **Guiding Block Detection**: query `tactile_paving=yes` di footway → garis polylines
- **Road Barriers**: query `construction=yes` di jalan → titik hambatan
- **Fallback Endpoint**: `overpass-api.de` utama, `overpass.kumi.systems` cadangan
- **Timeout**: 15 detik per query

### Flow Sistem
1. Map/journey memanggil `fetchGuidingLines(bbox)` atau `fetchRealtimeAccessibility(bbox)`
2. Query Overpass API dengan bounding box
3. Hasil dikonversi ke `MapLineFeature[]` (polylines) atau `MapFeature[]` (titik)
4. Ditampilkan overlay di peta (kuning = guiding, merah = barrier)
5. Juga digunakan oleh journey untuk hazard detection dalam 150m corridor

### File Kunci
- `src/lib/realtimeOverpass.ts` — semua query Overpass
- `src/components/map/Accessible3DMap.tsx` — render garis/titik
- `src/components/journey/JourneyMap.tsx` — guiding lines di rute

---

## 11. Asisten AI

### Apa
Asisten aksesibilitas berbasis data yang menjawab pertanyaan tentang tempat, hambatan, dan fasilitas. Tidak pernah mengarang — hanya menjawab berdasarkan data yang ada.

### Intent yang Didukung
| Intent | Contoh Pertanyaan |
|---|---|
| `wheelchair_place` | "Mana yang bisa kursi roda?" |
| `visual_place` | " mana yang ada guiding block?" |
| `barriers_toward` | "Hambatan ke RSUD?" |
| `facility_with` | "Dimana ada lift?" |
| `feature_status` | "Apakah ramps di UNJ masih bagus?" |
| `ambiguous` | Pertanyaan tidak jelas → klarifikasi |

### Flow Sistem
1. Pengguna ketik/ucap pertanyaan
2. POST `/api/ai/assistant` → backend parse intent → query data → susun jawaban
3. Hasil: teks jawaban + sumber (laporan/skor/fitur) + tindak lanjut + disclaimer
4. Sumber ditampilkan dengan badge keandalan: VERIFIED (hijau), COMMUNITY_REPORTED (kuning), UNKNOWN (abu-abu)
5. Untuk profil tunanetra: jawaban auto-dibacakan + tombol "Dengarkan" replay

### File Kunci
- `src/components/assistant/Assistant.tsx`
- `src/app/api/ai/assistant/route.ts`
- `backend/assistant.go` — intent parsing + jawaban
- `backend/handlers_ai.go` — HTTP handler

---

## 12. Chatbot Suara

### Apa
Chatbot percakapan berbasis Groq LLM (llama-3.3-70b-versatile) dengan input/output suara. Dioptimalkan untuk pengguna tunanetra.

### Fitur
- **Input**: teks atau suara (STT via browser atau Groq whisper)
- **Output**: teks + auto-TTS + haptic (40ms vibrate)
- **Konteks**: enrich dengan data BlindSpot (tempat, fitur, laporan) sebelum kirim ke LLM
- **Riwayat**: max 6 pesan terakhir dikirim ke LLM
- **Sign Language**: panel bahasa isyarat untuk jawaban terakhir
- **Fallback**: jika `GROQ_API_KEY` tidak ada → jawaban deterministik

### Flow Sistem
1. Pengguna ketik/ucap pesan
2. POST `/api/chatbot` → enrich dengan data BlindSpot → kirim ke Groq LLM
3. Response ditampilkan + dibacakan via TTS + haptic
4. Jika browser STT tidak tersedia → fallback ke `POST /api/chatbot/transcribe` (Groq whisper)

### File Kunci
- `src/components/chatbot/BlindChatbot.tsx` — halaman penuh
- `src/components/chatbot/FloatingChatbot.tsx` — floating button (semua halaman kecuali /map)
- `backend/handlers_ai.go` — handler chatbot + transcribe

---

## 13. Text-to-Speech (TTS)

### Apa
Sistem pembacaan teks global berbasis Web Speech API dengan sistem antrian prioritas.

### Prioritas Audio
| Level | Kode | Contoh |
|---|---|---|
| 1 - CriticalWarning | `CriticalAlert` | Bahaya di depan, rute terblokir |
| 2 - NavigationInstruction | `RouteInstruction` | "Belok kiri 50 meter" |
| 3 - UserRequestedInformation | `UserRequestedInformation` | Jawaban asisten, detail tempat |
| 4 - GeneralUiFeedback | `GeneralUiFeedback` | "Halaman peta", "3 hasil ditemukan" |

### Fitur
- **Priority Queue**: utterance baru dengan prioritas lebih tinggi mempreempt yang lebih rendah
- **Voice Selection**: preferensi `id-id` → `id*` → `en*`
- **Repeat Last**: ulang pengumuman terakhir
- **Enable/Disable**: toggle global di Pengaturan atau ProfileFoundation
- **Auto-speak**: profil tunanetra auto-bacakan jawaban/rute

### Flow Sistem
1. Komponen panggil `audioManager.speak(text, priority)`
2. AudioManager cek prioritas vs utterance aktif → putuskan: queue, preempt, atau tolak
3. Buat `SpeechSynthesisUtterance` → pilih voice Indonesia → speak
4. Secara paralel: `announceLiveRegion(text)` untuk screen reader

### File Kunci
- `src/lib/audio/AudioManager.tsx` — bus audio global
- `src/lib/audio/tts.ts` — wrapper Web Speech API
- `src/components/voice/SpeakOnNavigate.tsx` — pengumuman halaman

---

## 14. Speech-to-Text (STT)

### Apa
Pengenalan suara berbasis Web Speech API dengan fallback server-side (Groq whisper).

### Fitur
- **Bahasa**: `id-ID` (Indonesian)
- **Interim Results**: menampilkan teks sementara saat bicara
- **Auto-restart**: mode kontinu untuk sesi panjang
- **Server Fallback**: Groq `whisper-large-v3-turbo` via `/api/chatbot/transcribe`
- **Status Handling**: `inactive → listening → processing`, dengan pesan Indonesia per status

### Flow Sistem
1. User aktifkan mic → `useSpeechRecognition.start()`
2. Browser SpeechRecognition mulai → interim results ditampilkan
3. Final transcript diterima → dikirim ke fungsi terkait (search, report, chatbot)
4. Jika browser tidak support → tampilkan fallback teks input + pesan "Kamu tetap bisa menulis"

### File Kunci
- `src/lib/voice/useSpeechRecognition.ts` — hook STT
- `src/lib/voice/commands.ts` — parsing perintah suara
- `src/app/api/chatbot/transcribe/route.ts` — server STT

---

## 15. Perintah Suara Global

### Apa
Sistem perintah suara hands-free yang aktif di halaman beranda dan peta. Mendengarkan perintah dan menjalankan aksi navigasi.

### Perintah yang Didukung
| Perintah | Aksi |
|---|---|
| "ulang" / "repeat" | Ulangi pengumuman terakhir |
| "berhenti" / "stop" | Hentikan semua suara |
| "cari [query]" | Pencarian tempat |
| "peta" / "map" | Navigasi ke /map |
| "lapor" / "report" | Navigasi ke /report |
| "rute" / "route" | Navigasi ke /route |
| "bantuan" / "help" | Tampilkan bantuan |
| "kembali" / "back" | Kembali ke halaman sebelumnya |
| "beranda" / "home" | Navigasi ke / |
| "profil" / "profile" | Navigasi ke /profile |

### Flow Sistem
1. `GlobalVoiceCommander` aktif di AppShell (mount sekali)
2. Di halaman `/` dan `/map`: STT always-on (auto-restart)
3. Transkrip → `parseCommand()` → identifikasi intent → eksekusi aksi
4. Haptic feedback setiap perintah dikenali
5. Perintah tidak dikenal → announce hint

### File Kunci
- `src/components/ui/GlobalVoiceCommander.tsx` — komponen global
- `src/lib/voice/commands.ts` — parser perintah

---

## 16. Bahasa Isyarat

### Apa
Sistem rendering bahasa isyarat Indonesia menggunakan avatar 2D animasi dengan glosarium 150+ tanda.

### Fitur
- **AvatarFigure**: SVG stick figure dengan lengan/artikulasi yang dianimasikan per glos
- **Gloss Dictionary**: 150+ tanda Indonesia (kata + sinonim → pose)
- **Text-to-Gloss**: konversi teks ke urutan glos
- **Speed Control**: 0.75x / 1x / 1.3x
- **Queue-based**: kata per kata, animasi berurutan
- **Reduced Motion**: disable animasi jika preferensi aktif

### Integrasi
- **JourneyController**: instruksi navigasi saat ini
- **Assistant**: jawaban asisten
- **BlindChatbot**: balasan chatbot
- **ReportFlow**: label form

### File Kunci
- `src/components/sign-language/AvatarFigure.tsx`
- `src/components/sign-language/useSignLanguagePlayer.ts`
- `src/components/sign-language/SignLanguagePanel.tsx`
- `src/lib/sign-language/text-to-gloss.ts`
- `src/lib/sign-language/gloss-dictionary.ts`
- `src/state/SignLanguageContext.tsx`

---

## 17. Gamifikasi & Pencapaian

### Apa
Sistem poin dan badge untuk mendorong kontribusi komunitas.

### Badge
| Badge | Kode | Syarat |
|---|---|---|
| Laporan Pertama | `FIRST_REPORT` 🌟 | Kirim laporan pertama |
| 3 Laporan | `THREE_REPORTS` 🛡️ | 3 laporan diverifikasi |
| 5 Laporan | `FIVE_REPORTS` 🏅 | 5 laporan diverifikasi |
| Laporan Foto | `PHOTO_REPORT` 📸 | Kirim laporan dengan foto |
| Keparahan Tinggi | `HIGH_SEVERITY` ⚠️ | Lapor hambatan HIGH severity |
| Kontribusi Terverifikasi | `VERIFIED_CONTRIBUTION` ✅ | Laporan kamu diverifikasi orang lain |

### Poin
- Dasar per laporan: 10 poin
- Bonus severity: HIGH (+5), MEDIUM (+3), LOW (+1)
- Bonus verifikasi komunitas: +5
- Selesai journey: +15

### Flow Sistem
1. Submit laporan → backend hitung poin + cek badge baru → return `gamification` object
2. Frontend update `GamificationContext` + tampilkan toast pencapaian
3. Ranking tersedia via GET `/api/gamification?ranking=1` → top-10 leaderboard

### File Kunci
- `backend/gamification.go` — logika poin + badge
- `src/lib/gamification-defs.ts` — definisi badge
- `src/lib/data/gamification.ts` — data gamifikasi frontend
- `src/state/GamificationContext.tsx` — state gamifikasi
- `src/components/profile/GamificationSummary.tsx` — UI pencapaian

---

## 18. Halaman Komunitas

### Apa
Halaman feed laporan komunitas dengan tab, filter, dan statistik.

### Fitur
- **Tab**: Terdekat / Terbaru / Terverifikasi
- **Filter**: per profil (VISUAL / WHEELCHAIR) + per status
- **Infinite Scroll**: muat lebih banyak saat scroll
- **Statistik Hero**: total laporan, total terverifikasi, total menunggu
- **CTA**: "Bantu laporkan hambatan" → /report, "Lihat lokasi di peta" → /map
- **Jarak**: dihitung dari posisi pengguna via haversine

### File Kunci
- `src/app/community/page.tsx` — halaman + hero stats
- `src/components/community/CommunityFeed.tsx` — feed
- `src/components/community/ReportSummaryCard.tsx` — kartu laporan

---

## 19. Tempat Tersimpan

### Apa
Sistem bookmark tempat untuk pengguna terdaftar. Disimpan ke MySQL.

### Flow Sistem
1. Di detail tempat atau search result → klik "Simpan"
2. POST `/api/saved` → toggle save/unsave
3. Halaman `/saved` → daftar tempat tersimpan dengan jarak + tombol hapus

### File Kunci
- `backend/handlers_saved.go`
- `src/app/saved/page.tsx`
- `src/components/saved/SavedPlacesList.tsx`

---

## 20. Panel Pengaturan

### Apa
Panel konfigurasi pengalaman personal.

### Pengaturan
| Kategori | Opsi |
|---|---|
| Tampilan | Tema (terang/gelap), kontras tinggi, ukuran teks (sm/md/lg) |
| Aksesibilitas | Kurangi gerakan (auto-detect `prefers-reduced-motion`) |
| Audio | Aktif/nonaktifkan TTS global, tombol tes suara |
| Profil | Ganti profil aksesibilitas |

### Flow Sistem
1. Toggle pengaturan → `SettingsContext` update state + simpan ke `localStorage`
2. Effect ke DOM: ubah `data-theme`, `data-contrast`, font size di `document.documentElement`
3. Setiap perubahan di-announce via live region + TTS preview

### File Kunci
- `src/components/settings/SettingsPanel.tsx`
- `src/state/SettingsContext.tsx`
- `src/app/settings/page.tsx`

---

## 21. Panel Admin

### Apa
Panel moderasi untuk pengguna dengan role ADMIN.

### Fitur
- **Filter Status**: tab untuk filter laporan berdasarkan status
- **Moderasi**: set status (ACTIVE/REJECTED/RESOLVED) + catatan moderasi
- **User Management**: lihat daftar pengguna

### API Endpoints
| Endpoint | Deskripsi |
|---|---|
| `GET /api/admin/reports` | Daftar laporan untuk moderasi (LIMIT 100) |
| `PUT /api/admin/reports` | Update status + moderationNotes |

### File Kunci
- `src/app/admin/page.tsx`
- `src/components/admin/AdminPanel.tsx`
- `src/components/admin/AdminReportCard.tsx`
- `backend/handlers_reports.go` — admin handlers

---

## 22. Tutorial & Panduan

### Apa
Sistem onboarding + tutorial interaktif untuk memandu pengguna baru.

### Fitur
- **3-Step Onboarding**: Pilih tipe → Tutorial storyboard → Selesai
- **Storyboard**: frame per profil (VISUAL_FRAMES / WHEELCHAIR_FRAMES) dengan auto-TTS
- **Live Tour**: `startGuideTour("home")` → feature tour interaktif di halaman
- **Tutorial Replay**: bisa diulang kapan saja dari `/tutorial`

### File Kunci
- `src/app/onboarding/page.tsx`
- `src/components/onboarding/OnboardingStoryboard.tsx`
- `src/components/tutorial/FeatureTour.tsx`
- `src/lib/guide-tour.ts`

---

## 23. Arsitektur Backend Go

### Struktur
```
backend/
├── main.go              # Entry point: loadConfig, ensureDB, loadMemoryCache, seed, start server
├── routes.go            # HTTP route registration + auth/profile handlers
├── handlers_places.go   # Place endpoints (list, detail, evaluation, entrances)
├── handlers_reports.go  # Report CRUD + verification + admin
├── handlers_routes.go   # Route planning (OSRM + demo fallback)
├── handlers_ai.go       # AI assistant + chatbot + STT + voice report analysis
├── handlers_saved.go    # Saved places toggle
├── places.go            # Place logic + scoring evaluation
├── reports.go           # Report CRUD + verification + media
├── route_engine.go      # OSRM integration + corridor analysis
├── scoring.go           # Accessibility scoring per profile
├── assistant.go         # Intent parsing + deterministic answers
├── ai.go                # Groq API client (chatbot + image analysis)
├── structurer.go        # Voice transcript → structured report
├── voice.go             # Voice analysis helpers
├── gamification.go      # Points + badges logic
├── demo.go              # Hardcoded demo data (8 places, 42 features, 4 reports)
├── seed.go              # Seed DB with demo data on startup
├── db.go                # MySQL connection + memory cache loading
├── schema.go            # CREATE TABLE statements (all tables)
├── auth.go              # scrypt hash + HMAC session
├── middleware.go        # CORS + panic recovery
├── config.go            # Config loading (env + files)
├── users.go             # User queries + reporter key
├── profile.go           # Accessibility profile DB operations
├── layers.go            # 11 map feature layer definitions
├── data.go              # Data helper functions
├── response.go          # JSON response helpers
├── rate.go              # In-memory rate limiter
├── rand.go              # Cryptographic random
├── null.go              # SQL nullable helper
└── go.mod               # Module: blindspot/backend, Go 1.26
```

### Middleware
- **CORS**: allow all origins, all methods
- **Panic Recovery**: catch panic → 500 response
- **Rate Limiting**: per-handler, per-IP, in-memory sliding window
- **Auth**: HMAC-SHA256 signed cookie → `requireSession()` extracts user

### Data Flow
1. Startup → `loadConfig()` → `ensureDatabase()` (create tables) → `loadMemoryCache()` (load demo data) → `seedDatabase()` (insert demo data if empty) → start HTTP server on `:8080`
2. Request → middleware (CORS + recovery) → route handler → in-memory cache or MySQL → JSON response
3. Next.js dev server (`:3000`) rewrites `/api/*` → `http://127.0.0.1:8080/api/*` (kecuali route handler Next.js yang ada di `src/app/api/`)

---

## 24. Basis Data

### Tabel MySQL
| Tabel | Deskripsi |
|---|---|
| `users` | Akun pengguna (id, email, displayName, passwordHash, role) |
| `accessibility_profiles` | Profil aksesibilitas pengguna (userId, type) |
| `places` | Tempat (id, name, address, lat, lng, category, city) |
| `entrances` | Pintu masuk tempat (placeId, label, steps, width, hasRamp, isRecommended) |
| `accessibility_features` | Fitur aksesibilitas tempat (placeId, kind, severity, description, ...) |
| `map_features` | Fitur peta global (kind, lat, lng, severity, ...) |
| `accessibility_scores` | Skor aksesibilitas tempat (placeId, visual, mobility) |
| `accessibility_reports` | Laporan pengguna (id, category, description, severity, status, authorId, placeId, lat, lng, ...) |
| `report_media` | Foto/lampiran laporan (reportId, url, type, mimeType, size) |
| `report_verifications` | Verifikasi komunitas (reportId, action, comment, authorKey, ...) |
| `saved_places` | Tempat tersimpan (userId, placeId) |
| `gamification` | Poin + badge (reporterId, points, badges, ...) |

---

## 25. Rate Limiting & Keamanan

### Rate Limiting
| Endpoint | Batas | Window |
|---|---|---|
| Register | 5 req | per IP |
| Login | 5 req | per IP |
| Reports (create) | 8 req | per IP |
| Verify/Change/Resolve | 15 req | per IP |
| Admin update | 30 req | per IP |
| Saved (write) | 30 req | per IP |
| Routes | 20 req | per IP |
| AI Assistant | 20 req | per IP |
| AI Image | 10 req | per IP |
| Chatbot | 20 req | per IP |
| Chatbot STT | 10 req | per IP |

### Keamanan
- **Password**: scrypt (N=16384, r=8, p=1, 64 bytes)
- **Sesi**: HMAC-SHA256 signed token (bukan JWT), HttpOnly cookie, SameSite=Lax, TTL 7 hari
- **Auth Secret**: env `AUTH_SECRET` → file `data/auth-secret` → fallback dev
- **Reporter Key**: `user:<id>` jika login, `anon:<sha256(ip)>` jika anonim
- **CORS**: allow all (development mode)

---

## Arsitektur Frontend (Next.js)

### State Management
| Context | Penyimpanan | Scope |
|---|---|---|
| `ProfileContext` | localStorage + module singleton | Profil aktif, userType, ready |
| `AuthContext` | API + cookie | Sesi pengguna |
| `SettingsContext` | localStorage | Tampilan, audio, preferensi |
| `GamificationContext` | localStorage + API | Poin, badge |
| `SignLanguageContext` | localStorage | Status aktif/nonaktif bahasa isyarat |

### Routing (App Router)
| Path | Halaman | Deskripsi |
|---|---|---|
| `/` | HomeController | Beranda dengan quick actions + tempat terdekat |
| `/onboarding` | Onboarding | 3-step wizard pilih profil |
| `/login` | Login | Form email + password |
| `/register` | Register | Form daftar akun baru |
| `/map` | MapPageController | Peta interaktif full-screen |
| `/places/[id]` | PlaceDetailPage | Detail tempat + skor + pintu masuk |
| `/report` | ReportFlow | Wizard buat laporan |
| `/report/[id]` | ReportDetailPage | Detail laporan + verifikasi |
| `/community` | Community | Feed laporan komunitas |
| `/route` | RoutePlanner | Perencanaan rute |
| `/journey` | JourneyController | Navigasi terbimbing |
| `/search` | SearchPage | Pencarian tempat |
| `/assistant` | Assistant | Asisten AI |
| `/chatbot` | BlindChatbot | Chatbot suara |
| `/saved` | SavedPlacesList | Tempat tersimpan |
| `/settings` | SettingsPanel | Pengaturan |
| `/admin` | AdminPanel | Panel admin (role ADMIN) |
| `/profile` | Profile | Profil + switcher |
| `/tutorial` | Tutorial | Panduan pengguna |
| `/3d-map` | Accessible3DMap | Peta 3D standalone |
