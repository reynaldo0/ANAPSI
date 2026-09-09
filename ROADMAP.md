# BLINDSPOT — ROADMAP.md

> **Project:** BLINDSPOT — Navigate Beyond Barriers
> **Goal:** Membangun seluruh produk sesuai MAIN.md, REQUIREMENT.md, DESIGN.md, dan TALKBACK.md tanpa ada requirement yang terlewat.
> **Status Legend:** `[ ]` Belum dikerjakan · `[~]` Sedang dikerjakan · `[x]` Selesai

---

# 0. PRINSIP ROADMAP

**Hierarki dokumen:**

```text
MAIN.md        → Tujuan akhir & North Star
REQUIREMENT.md → Fitur & functional requirements
DESIGN.md      → UI/UX & design implementation
TALKBACK.md    → TalkBack & screen reader accessibility (wajib untuk tunanetra)
```

Urutan fase mengikuti **IMPLEMENTATION ORDER** pada REQUIREMENT.md §26 dan **PRIORITAS** pada MAIN.md:

```text
ACCESSIBILITY
    ↓
REAL USABILITY
    ↓
SPEED & RESPONSIVENESS
    ↓
RELIABILITY
    ↓
CLARITY
    ↓
BEAUTIFUL UI
    ↓
ADVANCED FEATURES
```

Aturan wajib:

- **RULE 1** Jangan membuat placeholder yang dipresentasikan sebagai fitur jadi. Jika integrasi eksternal tidak tersedia, buat fallback mock yang diberi label jelas.
- **RULE 2** Jangan bangun fitur P2 sebelum P0 stabil.
- **RULE 3** Output AI tidak boleh menjadi kebenaran final tanpa konfirmasi user / status verifikasi.
- **RULE 4** Map TIDAK BOLEH menjadi satu-satunya antarmuka informasi. Selalu sediakan List View.
- **RULE 5** Jangan klaim rute bebas hambatan penuh tanpa data cukup.
- **RULE 6** Setiap API call harus menangani kegagalan.
- **RULE 7** Setiap form harus memvalidasi input.
- **RULE 8** Semua operasi terproteksi memerlukan otorisasi.
- **RULE 9** Jangan mengekspos secret di kode client.
- **RULE 10** Komponen reusable, hindari duplikasi logika.
- **RULE 11** Semantic HTML first; ARIA hanya jika diperlukan; jangan biarkan audio BLINDSPOT bertabrakan dengan screen reader (TALKBACK.md §6–8).

**Definisi Selesai (Definition of Done)** — sebuah fitur dianggap DONE hanya jika SEMUA ini dipenuhi:

- [ ] UI diimplementasikan.
- [ ] Logika fungsional berfungsi.
- [ ] Loading state ada.
- [ ] Error state ada.
- [ ] Empty state ada jika relevan.
- [ ] Responsive mobile.
- [ ] Keyboard accessible.
- [ ] Screen-reader labels ada.
- [ ] Core journey dapat diselesaikan dengan screen reader / TalkBack (TALKBACK.md §43).
- [ ] API errors ditangani.
- [ ] Data dipersist jika diperlukan.
- [ ] Fitur sudah dites manual.

---

# 1. OVERVIEW FASE

```text
PHASE 0 — Fondasi & Setup
PHASE 1 — Authentication, Onboarding & Accessibility Profile   [P0]
PHASE 2 — Map, Places, Layers & Search                          [P0]
PHASE 3 — Place Detail & Accessibility Scoring                  [P0]
PHASE 4 — Report System: Text, Voice, Photo                     [P0]
PHASE 5 — Community Verification & Report Lifecycle             [P0]
PHASE 6 — Routing, Journey & Journey Brief                      [P0/P1]
PHASE 7 — AI Integrations & Accessibility Assistant             [P1/P2]
PHASE 8 — Admin, Settings & Polish                              [P0/P1]
PHASE 9 — QA, Pengujian & Audit Aksesibilitas
```

## Dependency Chain

```text
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5
                                   │
P6 ◄── P5 (membutuhkan report/barrier data)
P7 ◄── P4 (membutuhkan report flow)
P8 ◄── P1, P4 (membutuhkan auth + report)
P9 ◄── SEMUA FASE
```

---

# 2. PHASE 0 — FONDASI & PROJECT SETUP

**Tujuan:** Fondasi teknis, desain system, dan arsitektur inti sebelum fitur dibangun.

## 2.1 Project Setup

- [x] Scaffold Next.js + TypeScript + Tailwind CSS.
- [x] Konfigurasi ESLint, Prettier, dan path aliases (`@/*`).
- [x] Struktur direktori: `app/`, `components/`, `components/ui/`, `lib/`, `types/`, `prisma/`, `public/`.
- [x] Environment variables `.env.example` (tanpa secret asli).
- [x] Konfigurasi font utama (Inter / Geist / Atkinson Hyperlegible — satu font konsisten).
- [x] Metadata & lang attribute (`lang="id"`).
- [x] Service worker / caching strategy dasar untuk performa (NFR-001).

## 2.2 Design Tokens & Design System (DESIGN.md §55)

- [x] Token warna: primary (deep indigo), accent (soft teal/mint), neutral slate, semantic (success/warning/danger/unknown).
- [x] Token spacing (4–96px scale).
- [x] Token typography (display, h1–h3, body, small; body min 16px).
- [x] Token radius (8/12/16/24px).
- [x] Token shadows (subtle).
- [x] Token breakpoints (mobile/tablet/desktop).
- [x] Token z-index.
- [x] Token motion (short, subtle, fade/slide/scale; hormati `prefers-reduced-motion`).
- [x] Dark mode + High Contrast mode token support (FR-026).
- [x] Status accessibility TIDAK hanya warna — selalu text + icon (✓ Accessible / ⚠ Limited Access / ✕ Not Accessible / ? Unavailable) (TALKBACK.md §34, DESIGN.md §5.3).

## 2.3 Global Layout & Navigation (DESIGN.md §14–15)

- [x] Global `Header` (logo, navigasi primary, profil).
- [x] Global `Footer`.
- [x] `BottomNav` untuk mobile: `Home | Map | Report | Community | Profile` (Report = central action).
- [x] `SkipLink` ("Lewati ke konten utama").
- [x] Landmark structure: `<header>`, `<nav>`, `<main>`, `<footer>` di setiap halaman (TALKBACK.md §12).
- [x] Heading structure konsisten: H1 = nama halaman → H2 = bagian utama → H3 = detail; tanpa lompatan (TALKBACK.md §11).
- [x] Focus states: visible, kontras, konsisten, tidak tertutup elemen lain.
- [x] `ReducedMotionProvider` (hormati `prefers-reduced-motion`).
- [x] Focus order logis: skip link → header → main search → primary content → secondary → footer (TALKBACK.md §17, §52).

## 2.4 Component System (REQUIREMENT.md §16)

Bangun reusable components (minimal):

- [x] `Button` (primary/secondary/danger, loading state, disabled; **nama jelas & action-oriented** — bukan "Klik di sini"/"Lihat"/"More").
- [x] `IconButton` (accessible label wajib via `aria-label`, contoh "Dengarkan informasi aksesibilitas").
- [x] `Input` (label terlihat; placeholder bukan label).
- [x] `SearchInput`.
- [x] `Select`.
- [x] `Modal` (focus trap, Escape close, return focus ke trigger, accessible title, dialog labeling — "Laporkan hambatan, dialog").
- [x] `Drawer` (sama seperti Modal).
- [x] `Toast` (feedback singkat; bukan satu-satunya cara sampaikan error penting).
- [x] `Card`.
- [x] `Badge` (text + icon, bukan warna saja).
- [x] `AccessibilityScore` (angka, label, penjelasan faktor, data freshness).
- [x] `MapMarker` (icon + shape berbeda, bukan warna saja).
- [x] `ReportCard`.
- [x] `VerificationBadge`.
- [x] `AudioControl` (play/pause/stop/repeat, keyboard accessible; label status jelas tanpa bergantung animasi).
- [x] `ProfileSwitcher`.
- [x] `RouteCard`.
- [x] `EmptyState` (membantu, ada CTA).
- [x] `ErrorState` (jelas, tidak menyalahkan user, beri solusi).
- [x] `LoadingState` (informatif, bukan spinner tanpa konteks).
- [x] `LiveRegion`: sistem announcement (polite/assertive) untuk dynamic state (TALKBACK.md §21–22).

## 2.5 Audio Manager (MAIN.md §10–12, §19, §25)

**Sistem pusat — jangan biarkan komponen membuat audio sendiri.**

- [x] `AudioManager` terpusat dengan:
  - [x] `Priority System` (1 Critical Warning > 2 Navigation Instruction > 3 User Requested Info > 4 General UI Feedback).
  - [x] `Queue` (audio tidak saling tabrakan).
  - [x] `Current Playback` state.
  - [x] `Interrupt Control` (audio prioritas lebih tinggi memotong yang lebih rendah secara terkontrol).
  - [x] `Pause`.
  - [x] `Stop`.
  - [x] `Repeat`.
- [x] Strategi kecepatan: Native/Browser TTS untuk feedback cepat (Prioritas 1).
- [ ] Pre-generated/cached audio untuk informasi sering dipakai (Prioritas 2).
- [ ] Streaming untuk audio dinamis/panjang jika provider mendukung (Prioritas 3).
- [x] Tidak autoplay informasi panjang tanpa alasan (screen reader coexistence).
- [x] Audio tambahan bersifat user-controlled kecuali peringatan penting.
- [x] API audio: intent diproses dengan parsing lokal, bukan LLM (MAIN.md §16–17).
- [x] **TalkBack vs TTS priority** (TALKBACK.md §32):
  - [x] Normal interface → TalkBack membaca interface; BLINDSPOT TTS TIDAK menduplikasi pembacaan.
  - [x] User requests audio → TTS BLINDSPOT boleh dijalankan ("Dengarkan Journey Brief").
  - [x] Critical information → gunakan mekanisme announcement yang tepat, tanpa spam audio.
- [x] State TTS/audio selalu tampil sebagai teks yang dapat dibaca (play/pause/stop), bukan hanya ikon/animasi (TALKBACK.md §30).

## 2.6 Voice Command Router (MAIN.md §17)

- [x] Voice input → STT → intent detection → fast command router → application action.
- [x] Fast commands tanpa AI generatif: "Ulangi", "Berhenti", "Kembali", "Cari ...", "Laporkan hambatan".
- [x] Setiap voice command memiliki alternatif non-voice (keyboard/button).

## 2.7 Database & API Fondasi

- [x] Prisma schema lengkap sesuai REQUIREMENT.md §8 (User, AccessibilityProfile, Place, Entrance, AccessibilityFeature, AccessibilityReport, ReportMedia, ReportVerification, AccessibilityScore, SavedPlace).
- [x] Database migration awal (PostgreSQL).
- [x] Seed data (DIBERI LABEL jelas sebagai data demo/mock — RULE 1).
- [x] API response convention (success/error/loading) konsisten.
- [x] Global error handler API.
- [x] Validasi input API (RULE 7).
- [x] Rate limiting pada endpoint sensitif (NFR-006).

## 2.8 State Management (REQUIREMENT.md §19)

- [x] Auth state.
- [x] Active accessibility profile.
- [x] Map viewport.
- [x] Selected location.
- [x] Route state.
- [x] Report submission state.
- [x] Audio state.
- [x] Strategi data fetching/caching server data (hindari unnecessary global state).

## 2.9 Screen Reader & TalkBack Foundation (TALKBACK.md)

**Tiga sistem audio yang harus dibedakan (TALKBACK.md §3):**

- [x] 📱 TalkBack/Screen Reader → membaca & menavigasi interface.
- [x] 🔊 BLINDSPOT TTS → membacakan informasi yang diminta/dibutuhkan user.
- [x] 🎙️ Speech-to-Text → mengubah suara user menjadi teks/perintah.
- [x] Ketiganya bekerja bersama tanpa saling mengganggu.

**Semantic HTML First (TALKBACK.md §7):**

- [x] Gunakan elemen native: `<button>`, `<label>`, `<input>`, `<fieldset>`, `<legend>`, `<nav>`, `<main>`.
- [x] JANGAN pakai `<div onclick>` sebagai tombol.
- [x] JANGAN pakai `<div>` hanya untuk teks terlihat seperti heading.

**ARIA Rule (TALKBACK.md §8):**

- [x] Native HTML first; ARIA hanya jika diperlukan.
- [x] Jangan menambah ARIA berlebihan.
- [x] Contoh benar: `<button aria-label="Mulai navigasi ke Universitas Negeri Jakarta">`.

**Button naming (TALKBACK.md §9–10):**

- [x] Setiap tombol menjelaskan: APA elemennya + APA fungsinya.
- [x] Icon-only button wajib punya accessible name.

**Live Announcements (TALKBACK.md §21–24):**

- [x] Informasi dinamis diumumkan lewat live region yang tepat — jangan umumkan setiap perubahan kecil.
- [x] Informatif: loading ("Mencari lokasi."), selesai ("Pencarian selesai. 8 hasil ditemukan.").
- [x] Error dapat dibaca jelas ("Tidak dapat menemukan lokasi. Coba gunakan kata kunci lain.") — bukan hanya ikon/warna merah.
- [x] Loading tidak hanya spinner/skeleton (itu hanya visual).

**Focus management (TALKBACK.md §15–17):**

- [x] Focus terlihat, logis, tidak hilang, tidak berpindah tiba-tiba.
- [x] Modal: focus masuk saat terbuka & kembali ke trigger saat ditutup.
- [x] TIDAK ada keyboard trap di modal/sidebar/map control/dropdown.

---

# 3. PHASE 1 — AUTHENTICATION, ONBOARDING & ACCESSIBILITY PROFILE

**P0 — Requirement: FR-001, FR-002, FR-003 (profil).**

## 3.1 Database & Model

- [x] Model `User` (id, name, email, password_hash/auth_provider, role USER/ADMIN, timestamps).
- [x] Model `AccessibilityProfile` (user_id, profile_type, is_active, timestamps).
- [x] Model `SavedPlace` (FR-029 — bisa di fase ini sebagai model, UI di Phase 8).

## 3.2 API

- [x] `POST /api/auth/register` (validasi email, password).
- [x] `POST /api/auth/login`.
- [x] `POST /api/auth/logout`.
- [x] `GET /api/auth/me`.
- [x] `GET /api/profile`.
- [x] `PUT /api/profile`.
- [x] `GET /api/profile/accessibility`.
- [x] `PUT /api/profile/accessibility`.
- [x] Session persistence (refresh aman).
- [x] Proteksi route authenticated (FR-001 acceptance: unauthorized tidak bisa akses halaman terproteksi).

## 3.3 UI

- [x] Halaman `/register` (form validasi, loading, error).
- [x] Halaman `/login` (form validasi, loading, error, fallback).
- [x] Logout action.
- [x] Halaman `/onboarding` (FR-002):
  - [x] Step 1: "How do you navigate?" — dua pilihan besar: 👁 Visual Navigation & ♿ Wheelchair Mobility (selectable via mouse/touch/keyboard).
  - [x] Step 2: Penjelasan singkat personalisasi (map, warnings, scores, recommendations).
  - [x] Step 3: Simpan active profile.
- [x] `ProfileSwitcher` component (DESIGN.md §16): selalu jelas mode aktif, mengubah map layer/score/rekomendasi/warning saat berubah, transition smooth.
- [x] Menu "ubah profil" tersedia setelah onboarding.

## 3.4 Acceptance (FR-001 & FR-002)

- [~] User dapat register & login sukses.
- [x] Unauthorized tidak akses halaman terproteksi.
- [x] Session persist setelah refresh.
- [x] Profil dapat dipilih, disimpan persisten, dapat diubah.
- [ ] Profil aktif mengubah perilaku map & route (diuji bersama Phase 2).

---

# 4. PHASE 2 — MAP, PLACES, LAYERS & SEARCH

**P0 — Requirement: FR-003, FR-004, FR-005, FR-006, FR-027, FR-028.**

## 4.1 API & Data

- [x] Model `Place` (name, address, latitude, longitude, place_type, description) — di skema migrasi 0000.
- [x] Model `AccessibilityFeature` (feature_type, coords, status, metadata, verification_status) — di skema migrasi 0000.
- [x] Model `Entrance` (name, coords, accessibility_status, has_ramp, has_stairs, width_status, notes, verification_status) — di skema migrasi 0000.
- [x] `GET /api/places` + search query.
- [x] `GET /api/places/:id`.
- [x] `GET /api/map/features`.
- [x] `GET /api/map/features?profile=VISUAL_NAVIGATION`.
- [x] `GET /api/map/features?profile=WHEELCHAIR_MOBILITY`.
- [x] `GET /api/places/:id/entrances`.
- [~] Geo query: filter/sort fitur dekat lokasi (origin lat/lng + radius) selesai; fitur per-viewport belum (butuh dataset besar, NFR-001).

## 4.2 Map Integration

- [~] Integrasi map provider (sesuai kebutuhan & budget): keputusan = peta SVG custom offline tanpa provider/key untuk demo (dokumentasikan di postmortem; swap ke provider nyata di produksi).
- [x] Interactive map: zoom, pan.
- [x] Current location (FR-028): permission granted → tampil di map + jadi origin; ditolak → aplikasi tetap jalan + input manual (pilih tempat).
- [x] Map markers.
- [~] Marker clustering / viewport-based loading untuk dataset besar (NFR-001): belum dengan dataset demo.
- [x] Layer controls (minimal — satu select, bukan 10 tombol floating; DESIGN.md §20.2).
- [x] Map loading state, error state (retry = ulangi pencarian/lokasi).

## 4.3 Map Layers — Visual Navigation (FR-004)

- [x] Guiding Block: available / damaged / interrupted / unknown.
- [x] Pedestrian Crossing: available / signalized / non-signalized / unknown.
- [x] Audio Crossing Signal: available / unavailable / unknown.
- [x] Obstacles: construction / permanent / temporary / street furniture / other.
- [x] Surface Hazard: hole / damaged sidewalk / uneven surface / other.

## 4.4 Map Layers — Wheelchair Mobility (FR-005)

- [x] Ramp: available / damaged / unknown (+ slope estimate, surface condition opsional).
- [x] Stairs: present / jumlah steps jika diketahui.
- [x] Elevator: available / unavailable / out of service / unknown.
- [x] Path Width: accessible / limited / too narrow / unknown.
- [x] Surface Condition: good / uneven / damaged / blocked.
- [x] Accessible Entrance: accessible / partially accessible / not accessible / unknown.

## 4.5 Accessible List View (FR-027 / FR-003 IMPORTANT)

- [x] Tombol "View as List" di map (toggle Peta/Daftar).
- [x] List menampilkan: nama, jarak, jenis informasi, status, verifikasi (DESIGN.md §21).
- [x] Ringkasan terstruktur (nama + jarak + status) dalam format list.
- [x] **Semua informasi penting di map tersedia sebagai teks/list** — tunanetra tidak diblokir dari informasi inti karena tidak bisa berinteraksi visual dengan map.
- [x] Tidak memaksa TalkBack membaca puluhan marker satu per satu tanpa struktur (TALKBACK.md §20).
- [x] Map = enhancement visual, BUKAN satu-satunya interface; daftar alternatif: nearby hazards, nearby accessible facilities, route information, filtered list (TALKBACK.md §19–20) — daftar feature + daftar hasil tempat.

## 4.6 Search (FR-006)

- [x] `SearchInput` dengan hasil pencarian.
- [x] Pilih destination dari hasil.
- [x] Navigasi ke `/places/[id]`.
- [x] Loading state ("Mencari lokasi...") → wajib juga diumumkan ke screen reader ("Mencari lokasi.").
- [x] Hasil selesai diumumkan ("Pencarian selesai. X hasil ditemukan.") via live region (TALKBACK.md §23).
- [x] Empty state (tidak ada hasil).
- [x] Error state (jelas, diumumkan, tetap bisa input ulang — TALKBACK.md §24).

## 4.7 Dashboard / Home

- [x] Home action-oriented (bukan dashboard statistik): greeting, primary search besar, quick actions (Explore Map / Report a Barrier / Profile), nearby accessibility updates, saved places & community links.

## 4.8 Acceptance (FR-003, FR-006, FR-028)

- [x] Map berfungsi & data layer berubah sesuai profil.
- [x] Interactive map + current location + search + zoom/pan + markers bekerja.
- [x] Semua layer visual & mobility dapat ditampilkan.
- [x] List view alternatif tersedia dari map.
- [x] Permission ditolak → aplikasi tetap berfungsi.

---

# 5. PHASE 3 — PLACE DETAIL & ACCESSIBILITY SCORING

**P0 — Requirement: FR-007, FR-008, FR-013.**

## 5.1 API & Data

- [x] Model `AccessibilityScore` (place_id, profile_type, score, confidence, calculated_at).
- [x] Model `Entrance` + data entrances.
- [x] Logika penghitungan score terpisah per profil (FR-007 — jangan gabung menjadi satu skor universal) → `src/lib/scoring.ts` (`evaluateAccessibility`).
  - [x] Visual score inputs: guiding block, pedestrian route condition, obstacles, crossing, data freshness.
  - [x] Wheelchair score inputs: ramp, stairs/barriers, surface, path width, entrance, data freshness.
- [x] `GET /api/places/:id/accessibility` (score + faktor + confidence + freshness + source).

## 5.2 Place Detail Page (`/places/[id]`)

- [x] Back navigation.
- [x] Nama tempat + alamat (+ koordinat).
- [x] Accessibility summary per active profile (angka + label, bukan angka saja).
- [x] Label skor: 80–100 Highly Accessible / 60–79 Partially Accessible / 40–59 Limited Accessibility / 0–39 Significant Barriers.
- [x] Kalimat disclaimer: "Based on available community data" — bukan jaminan keamanan nyata.
- [x] Key conditions (✓ / ⚠ / ✕ dengan text + icon).
- [x] Facilities list.
- [x] Barriers list.
- [x] Entrances (FR-013): rekomendasi entrance terbaik berdasarkan active profile.
- [x] Community reports (terbaru).
- [x] Verification status + last updated.
- [x] Main CTA: "Find Accessible Route" (FR-006 / DESIGN.md §22).
- [x] Urutan informasi logis untuk TalkBack: nama tempat → status aksesibilitas per profil → entrance → verifikasi → CTA (TALKBACK.md §18).

## 5.3 Score Facility

- [x] `AccessibilityScore` component menampilkan: angka, label, "View details", penjelasan "What affects this score?", faktor-faktor, tingkat confidence/freshness.
- [x] Data lama/data kurang → tidak dipresentasikan sebagai highly reliable (FR-008); tanpa bukti → skor `null` + "Data Belum Tersedia" (Test Flow E).

## 5.4 Acceptance

- [x] Score per profil berbeda untuk tempat yang sama (verified: place-unj wheelchair 53 vs visual 49, dsb).
- [x] Faktor penyusun score tampil.
- [x] Freshness/confidence diindikasikan.
- [x] Empty data → TIDAK mengarang score (Test Flow E).

---

# 6. PHASE 4 — REPORT SYSTEM (TEXT, VOICE, PHOTO)

**P0/P1 — Requirement: FR-015, FR-016, FR-017, FR-018, FR-021.**

## 6.1 API, Data & Storage

- [x] Model `AccessibilityReport` (reporter_id, category, description, coords, severity, affected_profiles, status, ai_generated, timestamps) + migrasi `0001_report_extended`.
- [x] Model `ReportMedia` (report_id, media_type, media_url, created_at).
- [x] `POST /api/reports`.
- [x] `GET /api/reports` (filter: placeId, profile, mine).
- [x] `GET /api/reports/:id`.
- [x] `PUT /api/reports/:id` (kategori/deskripsi/severity/profiles; status hanya admin).
- [x] Upload media: validasi file type, file size, upload status; gagal upload ditampilkan jelas (FR-017) → `src/lib/api/media.ts` + pesan `UPLOAD_FAILED`.
- [x] Storage: jalur DB via `ReportMedia`; mode demo pakai data-URL di memori server dengan label jelas ("hilang saat server dimatikan"). Cloud object → produksi (postmortem).

## 6.2 Report Flow UI (DESIGN.md §28)

- [x] Screen 1 — "How would you like to report?" (🎙 Speak / 📷 Photo / ⌨ Write).
- [x] Screen 2 — Report Information (what/what happened, where, who affected).
- [x] Screen 3 — Review & Confirm (user review sebelum submit — WAJIB).
- [x] Success state setelah submit (+ link detail laporan).
- [x] Announcement sukses via live region: "Laporan berhasil dikirim." (TALKBACK.md §21).
- [x] Loading states: "Mengirim laporan..." (voice/photo dijalankan di perangkat, bukan server).
- [x] Error states dengan solusi (Try Again / Write Report Instead).

## 6.3 Text Report (FR-016)

- [x] Fields: category, description, location, affected profile, optional severity, optional photo.
- [x] Validasi form (RULE 7) + error live-region assertive.

## 6.4 Voice Report (FR-015)

- [x] Press record → record voice → speech-to-text (Web Speech API `id-ID`).
- [x] Streaming/interim transcription bila memungkinkan (interim ditampilkan & diumumkan).
- [x] Feedback langsung saat listening ("Listening...", "Tap to stop").
- [x] Transkrip tampil cepat setelah selesai.
- [x] AI structuring: category, description, affected profile, severity, suggested location → `src/lib/voice/report-structurer.ts` (rule-based di perangkat).
- [x] **AI extraction HASILNYA EDITABLE oleh user sebelum submit** (CRITICAL) — semua field terisi ke formulir yang bisa diedit.
- [x] Fallback ke manual jika STT/AI gagal (peramban tak mendukung → "Tulis laporan saja").
- [x] Voice report UI sangat sederhana (DESIGN.md §29).
- [x] Voice input BUKAN satu-satunya cara — selalu ada alternatif 🎙️ Bicara ATAU ⌨️ Ketik (TALKBACK.md §27).
- [x] Status mikrofon accessible: "Mikrofon: Inactive/Listening" — teks, bukan hanya warna (TALKBACK.md §29).
- [x] STT flow announcement (TALKBACK.md §28): "Mikrofon aktif. Silakan berbicara." → "Mendengarkan." → "Transkripsi selesai."
- [x] Transkrip tampil & diumumkan; user konfirmasi sebelum submit (TALKBACK.md §28, §41 FLOW 5).
- [~] STT server-side/provider streaming → produksi (untuk sekarang Web Speech API perangkat; catat postmortem).

## 6.5 Photo Report (FR-017)

- [x] Upload image + location + description + submit.
- [x] Validasi file type/size/status, error jelas.
- [~] AI image analysis (FR-018): **ditunda** — tanpa model vision/key (RULE 9), UI jujur menampilkan analisis belum tersedia + pemilihan kategori manual.
  - [ ] Deteksi kategori: stairs, ramp, guiding block, damaged sidewalk, obstacle (automatis) → manual tidak apa-apa (FR-018 fallback).
  - [x] Editable sebelum submit.
  - [x] Konfirmasi user sebelum publikasi (layar Review & Confirm).
  - [x] UI tidak mengklaim AI menjamin aksesibilitas/keselamatan (DESIGN.md §30 — tidak ada klaim AI).
- [x] Fallback manual jika AI gagal.
- [x] Photo report accessibility (TALKBACK.md §36): "Foto hambatan dipilih." / "Foto hambatan dihapus."; foto dapat dihapus. ("Analisis sedang berlangsung" tidak dipakai karena analisis tidak berjalan — jujur.)
- [x] Alt text untuk gambar bermakna ("Foto hambatan aksesibilitas."); gambar dekoratif diabaikan.

## 6.6 Report Detail Page (`/report/[id]`) & History

- [x] Category, location (alamat + koordinat), status, description, pelapor, created date (FR-021).
- [x] Verification actions (FR-021, TALKBACK "Still Accurate / Condition Changed") → Phase 5.
- [x] Report history untuk halaman profil (FR-030).

---

# 7. PHASE 5 — COMMUNITY VERIFICATION & REPORT LIFECYCLE

**P0 — Requirement: FR-019, FR-020, FR-030.**

## 7.1 API & Data

- [x] Model `ReportVerification` (report_id, user_id, verification_type, comment, created_at).
- [x] Verification types: CONFIRMED / CHANGED / RESOLVED.
- [x] `POST /api/reports/:id/verify`.
- [x] `POST /api/reports/:id/changed`.
- [x] `POST /api/reports/:id/resolved`.
- [x] Lifecycle: `PENDING → VERIFIED → ACTIVE → OUTDATED / RESOLVED` (+ REJECTED untuk admin).
- [x] Laporan tidak hilang otomatis tanpa status history (FR-020).
- [x] Confidence berkurang untuk laporan lama (verification count, last verified date, latest evidence).

## 7.2 Community Page

- [x] Tabs: Nearby / Recent / Verified.
- [x] Filters: by profile, by status.
- [x] ReportCard: category, affects X profile, jarak, verification status, updated date, View Details.
- [x] Navigasi ke report detail.
- [x] Empty states: "Belum ada laporan aksesibilitas di area ini. Kamu dapat membantu menambahkan informasi."

## 7.3 Verification UX (DESIGN.md §32–33)

- [x] Action: "Still Accurate" (✓) / "Condition Changed" (↻) / "Issue Resolved" (✓).
- [x] Feedback setelah klik: "Terima kasih telah membantu menjaga informasi ini tetap terbarui."
- [x] Announcement aksi verifikasi berhasil: "Lokasi berhasil diperbarui." (TALKBACK.md §21).
- [x] Verification count & last verified date update.

## 7.4 Report History (FR-030)

- [x] User melihat laporan yang dibuat: status, verification updates, resolution status.

---

# 8. PHASE 6 — ROUTING, JOURNEY & JOURNEY BRIEF

**P0/P1 — Requirement: FR-009, FR-010, FR-011, FR-012.**

## 8.1 API & Logic

- [x] `POST /api/routes` (body: origin, destination, profile).
- [~] Base route dari routing/map provider — belum terkoneksi; memakai deterministic demo engine (polyline dari data komunitas).
- [x] Accessibility intelligence: ambil reports/features di dekat segment route → hitung route accessibility score → bandingkan alternatif → ranking sesuai profil.
- [x] Route types: Fastest Route vs Most Accessible Route.
- [x] Output: geometry, distance, time, accessibility score, detected barriers, facilities.
- [x] **Honest labeling** (RULE 5 / FR-009): jika data tidak cukup, label "Accessibility-informed route based on currently available community data."
- [x] Route unavailable → error message sesuai (REQUIREMENT.md §21).

## 8.2 Route Planner Page

- [x] Inputs: From (📍 Current Location atau manual), To (search), profile tampil ("For: ♿ Wheelchair Mobility").
- [x] RouteCards: Recommended (⭐ Most Accessible) + Alternative (Fastest) — distance, duration, score, alasan rekomendasi, barriers, CTA View Route.
- [x] Penjelasan kenapa route direkomendasikan (FR-011 contoh alasan).
- [x] Loading ("Mencari rute yang dapat diakses...").
- [x] Empty state (tidak ada alternatif rute).
- [x] Error state.

## 8.3 Journey Brief (FR-012)

- [x] Sebelum navigasi: full screen/focused screen.
- [x] Isi: destination, distance, estimated time, accessibility score, jumlah barriers diketahui, key warnings, recommended facilities.
- [x] Contoh format sesuai DESIGN.md §25.
- [x] TTS support untuk Visual Navigation profile ("Dengarkan Ringkasan").

## 8.4 Visual Navigation Mode (FR-010) — Audio-first

- [x] Audio route instructions (melalui AudioManager — Phase 0).
- [x] Current step information.
- [x] Next warning.
- [x] Repeat instruction button 🔊.
- [x] Upcoming barrier warning.
- [x] Route accessibility summary.
- [x] Text besar, high contrast, sedikit info per layar, audio controls jelas, tanpa animasi mengganggu (DESIGN.md §26).
- [x] Voice commands (optimal): "Ulangi instruksi", "Ada hambatan apa?", "Berapa jauh lagi?" — semua punya alternatif non-voice.
- [x] Saat "Start Navigation" diaktifkan, navigasi state diumumkan ke screen reader (TALKBACK.md §41 FLOW 4).

## 8.5 Wheelchair Navigation Mode (FR-011)

- [x] Highlight accessible segments.
- [x] Highlight stairs.
- [x] Highlight ramps.
- [x] Highlight narrow paths.
- [x] Highlight poor surface conditions.
- [x] Recommended route + alasan.
- [x] "Alternative available" + View Alternative CTA (DESIGN.md §27).

## 8.6 Journey Page — Elemen Umum

- [x] Current route info, next instruction, accessibility warnings, audio controls, repeat, end journey.
- [x] Report barrier CTA selama journey.
- [x] Route progress.
- [x] Dynamic route info diumumkan saat berubah: "Rute diperbarui." / "Terdapat hambatan baru yang dilaporkan pada rute." — jelas, singkat, tidak berulang (TALKBACK.md §33). (Demo statis: pengumuman terjadi saat navigasi dimulai / rute alternatif dipilih.)

---

# 9. PHASE 7 — AI INTEGRATIONS & ACCESSIBILITY ASSISTANT

**P1/P2 — Requirement: FR-022; enhance FR-015/FR-018; MAIN.md §16, §26.**

## 9.1 Prinsip AI (MAIN.md)

- [x] AI mempercepat, bukan memperlambat (bukan bottleneck) — asisten deterministik, respons instan dari data terstruktur.
- [x] Tidak dipanggil untuk semua hal; deterministik untuk hal yang butuh kecepatan.
- [x] AI tidak mengarang data aksesibilitas (RULE 3).
- [x] "Use AI where intelligence adds value. Use deterministic logic where speed matters."

## 9.2 Accessibility Assistant (FR-022)

- [x] `POST /api/ai/assistant`.
- [x] Jawab berdasarkan data terstruktur BLINDSPOT (prioritas: structured data → current report data → location data).
- [x] Membedakan jelas: verified info / community-reported / unknown (badge sumber + label in-line).
- [x] Jika data tidak ada: "Belum tersedia cukup data untuk memastikan kondisi tersebut."
- [x] TIDAK mengarang: ramp availability, guiding block, route safety, facility accessibility.
- [~] LLM provider (OpenAI/Anthropic/dll) belum dikonfigurasi — saat ini asisten v1 deterministik dari data terstruktur; seam `lib/ai/assistant.ts` jadi tempat tukar ke LLM bila key tersedia.

## 9.3 AI Voice Structuring (enhance Phase 4)

- [x] `POST /api/ai/analyze-voice-report` (category, description, affected profile, severity, suggested location) — provider deterministic saat ini.
- [x] Dapat diedit user (report flow Phase 4 tetap menampilkan hasil struktur untuk diedit sebelum kirim).

## 9.4 AI Image Analysis (P2)

- [ ] `POST /api/ai/analyze-image-report` (deteksi stairs, ramp, guiding block, damaged sidewalk, obstacle) — belum dapat direalisasikan: butuh provider vision (key/API). FR-018 memakai fallback manual (pilih kategori sendiri).
- [ ] Editable, user confirm, tidak mengklaim jaminan.

## 9.5 Voice Assistant Commands (P2)

- [x] Intent router tingkat lanjut di halaman Asisten (ulangi/hambatan/jarak untuk journey; tanya untuk asisten) — dasar di Phase 0 (report intent router) tetap ada.
- [x] Tetap ada fallback non-voice.

## 9.6 Fallback (MAIN.md §30)

- [x] STT gagal → "Tulis laporan sebagai alternatif." (dengan link ke /report).
- [x] TTS tidak tersedia → teks tetap tersedia.
- [x] AI gagal → manual report flow tetap jalan (error state asisten + jalur manual tidak berubah).

---

# 10. PHASE 8 — ADMIN, SETTINGS & POLISH

**P0/P1 — Requirement: FR-029, FR-031, FR-026; DESIGN.md §34–35.**

## 10.1 Admin (FR-031) — Protected

- [ ] Model `User.role = ADMIN`.
- [ ] Proteksi route `/admin` (hanya admin).
- [ ] View pending reports.
- [ ] View flagged reports.
- [ ] Approve / Reject.
- [ ] Mark outdated.
- [ ] Mark resolved.
- [ ] Add moderation notes.
- [ ] Report management, category management, review problematic reports.
- [ ] Loading/error/empty states.

## 10.2 Settings & Appearance (FR-026)

- [ ] Halaman settings: Appearance (System / Light / Dark), Accessibility (High Contrast, Reduce Motion), Text Size slider (A-/A+).
- [ ] Dark mode implementasi.
- [ ] High contrast mode (memperjelas boundaries, menjaga hierarchy, tidak hanya hitam-putih).
- [ ] Text scaling compatibility.
- [ ] Website tetap usable meskipun custom settings nonaktif (baseline contrast sudah accessible).

## 10.3 Profile Page (DESIGN.md §34)

- [ ] User information.
- [ ] Active accessibility profile (+ ubah).
- [ ] Appearance settings shortcut.
- [ ] Saved Places (FR-029).
- [ ] My Reports (FR-030).

## 10.4 Saved Places Page

- [ ] Daftar saved places (hanya authenticated user).
- [ ] Empty state: "Belum ada tempat tersimpan."

## 10.5 Search Page

- [ ] Halaman `/search` terpisah (jika dibutuhkan) memenuhi FR-006.

## 10.6 Polish & Microcopy (DESIGN.md §47–48)

- [ ] Tone friendly/respectful/calm/helpful; hindari pitying/infantilizing/overly technical.
- [ ] Microcopy konsisten: no data, unknown, verified, report.
- [ ] Button language action-oriented ("View Accessible Route", "Submit Report").
- [ ] Toast feedback singkat.
- [ ] Informasi sebelum dekorasi; tidak overload user.
- [ ] Review DESIGN DON'TS (§60): tidak ada generic admin dashboard aesthetic, excessive gradients/charts, tiny text, low contrast, icon-only tanpa label, banyak primary CTA.

---

# 11. PHASE 9 — QA, PENGUJIAN & AUDIT AKHIR

**Merujuk: REQUIREMENT.md §23 Accepting Testing, §24 Definition of Done; DESIGN.md §62.**

## 11.1 Teknologi & Infrastruktur Test

- [ ] Alat test (unit/integration/E2E sesuai kebutuhan).
- [ ] Manual test checklist.

## 11.2 Acceptance Test Flows

### Flow A — Tunanetra
- [ ] Open application → Select Visual Navigation → Search location → Open place details → Read/listen accessibility info → View barriers (bukan hanya map) → Generate route → Receive accessibility brief.
- Expected: semua info inti aksesibel via keyboard + screen-reader-compatible UI.

### Flow B — Wheelchair User
- [ ] Open application → Select Wheelchair Mobility → Search destination → View mobility score → View ramps/stairs/barriers → Generate route → Compare accessibility-informed route → View recommended entrance.

### Flow C — Voice Report
- [ ] Login → Open report → Record voice → Transcribe → AI structure report → User edits → Submit → Report pending.

### Flow D — Community Verification
- [ ] Open active report → Confirm condition → Verification count updates → Last verified date updates.

### Flow E — No Data
- [ ] Search location tanpa data → app JELAS menyatakan data tidak tersedia → TIDAK mengarang score/kondisi.

## 11.3 Keyboard Audit (FR-024, DESIGN.md §52)

- [ ] Tab navigation lancar.
- [ ] Enter/Space activation.
- [ ] Escape dismiss dialogs.
- [ ] Focus order logis (skip link → header → main search → primary content → secondary → footer).
- [ ] Focus trap di modal/drawer.
- [ ] Tidak ada keyboard traps.

## 11.4 Screen Reader Audit (FR-023, DESIGN.md §50)

- [ ] Semantic HTML.
- [ ] Heading hierarchy benar.
- [ ] Accessible labels untuk semua kontrol.
- [ ] Alt text bermakna.
- [ ] ARIA hanya jika semantic HTML kurang.
- [ ] Tidak ada info hanya via warna.
- [ ] Komponen penting punya label bermakna ("Repeat navigation instruction", bukan "Button").

## 11.5 Design QA Checklist (DESIGN.md §62)

### Visual
- [ ] Typography hierarchy jelas.
- [ ] Spacing konsisten.
- [ ] Colors konsisten.
- [ ] Buttons obvious.
- [ ] Tidak ada visual clutter.

### Mobile
- [ ] Bekerja di ukuran kecil.
- [ ] Touch targets ≥ 44×44px (ideal 48×48).
- [ ] Bottom nav berfungsi.
- [ ] Tidak ada horizontal overflow.

### Accessibility
- [ ] Keyboard navigation works.
- [ ] Focus visible.
- [ ] Screen reader labels exist.
- [ ] Contrast cukup.
- [ ] Color bukan satu-satunya makna.
- [ ] Map punya list alternatives.
- [ ] Text dapat scale.

### UX
- [ ] Setiap halaman punya primary action jelas.
- [ ] Loading states ada.
- [ ] Empty states ada.
- [ ] Error states ada.
- [ ] Forms validasi jelas.
- [ ] AI suggestions dapat direview.

## 11.6 NFR & Performa

- [ ] NFR-001 Performance: initial UI load efisien, map data progressive, clustering, image optimal.
- [ ] NFR-002 Responsive: desktop, tablet, mobile.
- [ ] NFR-004 Error handling: map fail, location denied, transcription fail, image analysis fail, submission fail, route fail — selalu ada feedback.
- [ ] NFR-005 Empty states semua halaman data-driven.
- [ ] NFR-006 Security: validate input, authorize protected ops, restrict admin, env secrets, validasi upload.
- [ ] NFR-007 Privacy: permission sebelum lokasi, tidak expose history, pisahkan lokasi laporan dari identitas, tanpa tracking terus-menerus.

## 11.7 Final Product Checklist (MAIN.md §34)

### 👁 Tunanetra
- [ ] Navigasi keyboard.
- [ ] Screen reader compatible.
- [ ] Info penting dalam teks terstruktur.
- [ ] TTS untuk info penting.
- [ ] Audio tidak bertabrakan.
- [ ] Audio dapat dihentikan.
- [ ] Audio dapat diulang.
- [ ] Voice input tersedia.
- [ ] STT feedback cepat.
- [ ] Voice report fallback manual.
- [ ] Map alternatif list view.

### ♿ Tunadaksa
- [ ] Profile dapat dipilih.
- [ ] Ramp ditampilkan.
- [ ] Tangga ditampilkan.
- [ ] Surface condition ditampilkan.
- [ ] Entrance info tersedia.
- [ ] Accessibility score tersedia.
- [ ] Route info sesuai profile.

### 🌍 Community
- [ ] Buat laporan.
- [ ] Lihat laporan.
- [ ] Status jelas.
- [ ] Verifikasi kondisi.
- [ ] Data lama ditandai outdated.

### 🤖 AI
- [ ] AI bantu tugas nyata.
- [ ] AI bukan bottleneck.
- [ ] AI output dapat diperiksa.
- [ ] AI tidak mengarang data.

## 11.8 TalkBack Testing — Mobile-First (TALKBACK.md §39)

Uji pada Android dengan **Google TalkBack**:

- [ ] Swipe navigation.
- [ ] Explore by touch.
- [ ] Double tap activation.
- [ ] Form interaction.
- [ ] Button labels.
- [ ] Dynamic announcements.
- [ ] Audio tidak bertabrakan antara TalkBack & TTS BLINDSPOT.

## 11.9 Desktop Screen Reader Testing (TALKBACK.md §40)

- [ ] Keyboard navigation berfungsi.
- [ ] Semantic structure benar.
- [ ] Focus management benar.
- [ ] Uji dengan screen reader desktop yang relevan di environment pengembangan.

## 11.10 TalkBack Core User Flow Test (TALKBACK.md §41)

### Flow 1 — Open Website
- [ ] Open → TalkBack identifikasi page title → navigasi main navigation → capai main content.

### Flow 2 — Search Location
- [ ] Navigate to Search → TalkBack baca search label → input destination → hasil pencarian diumumkan → pilih destination.

### Flow 3 — Accessibility Information
- [ ] Destination selected → TalkBack baca nama lokasi → summary aksesibilitas → info ramp/guiding block/surface → verification status.

### Flow 4 — Start Navigation
- [ ] User capai Start Navigation → TalkBack identifikasi tombol → aktifkan → navigasi state diumumkan.

### Flow 5 — Voice Report
- [ ] Aktifkan Report → pilih Voice Report → status mikrofon diumumkan → user bicara → transkrip muncul → transkrip diumumkan → user konfirmasi → sukses diumumkan.

## 11.11 TalkBack Acceptance Criteria (TALKBACK.md §42)

### Navigation
- [ ] Semua halaman dapat dinavigasi.
- [ ] Semua tombol memiliki nama jelas.
- [ ] Heading memiliki struktur logis.
- [ ] Landmark tersedia.
- [ ] Skip link tersedia.

### Keyboard
- [ ] Semua fitur utama dapat digunakan tanpa mouse.
- [ ] Focus selalu terlihat.
- [ ] Focus order logis.
- [ ] Tidak ada keyboard trap.

### Screen Reader
- [ ] Informasi penting dapat dibaca.
- [ ] Status dinamis diumumkan.
- [ ] Error diumumkan.
- [ ] Loading diumumkan.
- [ ] Form memiliki label.

### Map
- [ ] Map memiliki Accessible List View.
- [ ] Informasi penting tidak hanya tersedia secara visual.

### Audio
- [ ] Audio tidak bertabrakan.
- [ ] TTS dapat dihentikan.
- [ ] TTS dapat diulang.
- [ ] User memiliki kontrol audio.

### Voice
- [ ] Microphone memiliki accessible label.
- [ ] Listening state diumumkan.
- [ ] Transcript dapat diakses.
- [ ] Ada fallback input teks.

---

# 12. PRIORITAS MVP — STATUS TRACKING (REQUIREMENT.md §22)

## P0 — MUST HAVE

- [ ] Authentication. → Phase 1
- [ ] Accessibility profile. → Phase 1
- [ ] Interactive map. → Phase 2
- [ ] Visual & wheelchair map layers. → Phase 2
- [ ] Place detail. → Phase 3
- [ ] Accessibility score. → Phase 3
- [ ] Route request & accessibility-informed ranking. → Phase 6
- [ ] Text report. → Phase 4
- [ ] Voice report. → Phase 4
- [ ] Community verification. → Phase 5
- [ ] Screen-reader compatibility. → Phase 0 & 9 (detail: TALKBACK.md) | [ ]
- [ ] Accessible alternative to map. → Phase 2

## P1 — SHOULD HAVE

- [ ] Text-to-speech. → Phase 0 & 6
- [ ] Journey brief. → Phase 6
- [ ] Entrance guide. → Phase 3
- [ ] Facility finder. → Phase 3
- [ ] Photo report. → Phase 4
- [ ] AI voice structuring. → Phase 4 & 7

## P2 — ADVANCED / WOW (JANGAN blokir P0/P1)

- [ ] AI image accessibility analysis. → Phase 7
- [ ] Voice assistant commands. → Phase 7
- [ ] Real-time obstacle detection. → Phase 7+

---

# 13. MATRIKS COVERAGE — SEMUA FR & HALAMAN

## Functional Requirements Coverage

| ID | Fitur | Fase | Status |
|----|-------|------|--------|
| FR-001 | Authentication | 1 | [ ] |
| FR-002 | Onboarding | 1 | [ ] |
| FR-003 | Personalized Accessibility Map | 2 | [ ] |
| FR-004 | Map Layers — Tunanetra | 2 | [ ] |
| FR-005 | Map Layers — Wheelchair | 2 | [ ] |
| FR-006 | Location Search | 2 | [ ] |
| FR-007 | Location Accessibility Profile (score terpisah) | 3 | [ ] |
| FR-008 | Accessibility Score | 3 | [ ] |
| FR-009 | Accessible Route Planner | 6 | [x] |
| FR-010 | Visual Navigation Mode | 6 | [x] |
| FR-011 | Wheelchair Navigation Mode | 6 | [x] |
| FR-012 | Journey Accessibility Brief | 6 | [x] |
| FR-013 | Entrance Accessibility Guide | 3 | [ ] |
| FR-014 | Accessible Facility Finder | 3 | [ ] |
| FR-015 | Voice Report | 4 | [x] |
| FR-016 | Text Report | 4 | [x] |
| FR-017 | Photo Report | 4 | [x] |
| FR-018 | AI Accessibility Analyzer | 4/7 | [ ] |
| FR-019 | Community Verification | 5 | [x] |
| FR-020 | Report Lifecycle | 5 | [x] |
| FR-021 | Report Details | 4 | [x] |
| FR-022 | AI Accessibility Assistant | 7 | [x] |
| FR-023 | Screen Reader Compatibility (TALKBACK.md) | 0/9 | [ ] |
| FR-024 | Keyboard Navigation | 0/9 | [ ] |
| FR-025 | Text-to-Speech | 0/6 | [ ] |
| FR-026 | High Contrast & Low Vision Settings | 8 | [ ] |
| FR-027 | Accessible Alternative to Map | 2 | [ ] |
| FR-028 | Current Location | 2 | [ ] |
| FR-029 | Save Location | 8 | [ ] |
| FR-030 | Report History | 5/8 | [x] |
| FR-031 | Admin Report Moderation | 8 | [ ] |

## Halaman Wajib (REQUIREMENT.md §10.1)

| Halaman | Fase | Status |
|---------|------|--------|
| `/` Landing Page | 1 | [ ] |
| `/login` | 1 | [ ] |
| `/register` | 1 | [ ] |
| `/onboarding` | 1 | [ ] |
| `/map` | 2 | [ ] |
| `/search` | 2/8 | [ ] |
| `/places/[id]` | 3 | [ ] |
| `/route` | 6 | [ ] |
| `/journey` | 6 | [ ] |
| `/report` | 4 | [ ] |
| `/report/[id]` | 4 | [ ] |
| `/community` | 5 | [ ] |
| `/saved` | 8 | [ ] |
| `/profile` | 8 | [ ] |
| `/admin` | 8 | [ ] |

## Komponen Wajib (REQUIREMENT.md §16 / DESIGN.md §56)

| Komponen | Fase | Status |
|----------|------|--------|
| Button | 0 | [ ] |
| IconButton | 0 | [ ] |
| Input | 0 | [ ] |
| SearchInput | 0 | [ ] |
| Select | 0 | [ ] |
| Modal | 0 | [ ] |
| Drawer | 0 | [ ] |
| Toast | 0 | [ ] |
| Card | 0 | [ ] |
| Badge | 0 | [ ] |
| AccessibilityScore | 3 | [ ] |
| MapMarker | 2 | [ ] |
| ReportCard | 5 | [ ] |
| VerificationBadge | 5 | [ ] |
| AudioControl | 0/6 | [ ] |
| ProfileSwitcher | 1 | [ ] |
| RouteCard | 6 | [ ] |
| EmptyState | 0 | [ ] |
| ErrorState | 0 | [ ] |
| LoadingState | 0 | [ ] |

## API Coverage (REQUIREMENT.md §9)

| Endpoint | Fase | Status |
|----------|------|--------|
| POST /api/auth/register | 1 | [ ] |
| POST /api/auth/login | 1 | [ ] |
| POST /api/auth/logout | 1 | [ ] |
| GET /api/auth/me | 1 | [ ] |
| GET /api/profile | 1 | [ ] |
| PUT /api/profile | 1 | [ ] |
| GET /api/profile/accessibility | 1 | [ ] |
| PUT /api/profile/accessibility | 1 | [ ] |
| GET /api/places | 2 | [ ] |
| GET /api/places/:id | 2 | [ ] |
| GET /api/places/:id/accessibility | 3 | [ ] |
| GET /api/places/:id/entrances | 3 | [ ] |
| GET /api/map/features | 2 | [ ] |
| GET /api/map/features?profile=... | 2 | [ ] |
| POST /api/reports | 4 | [ ] |
| GET /api/reports | 4 | [ ] |
| GET /api/reports/:id | 4 | [ ] |
| PUT /api/reports/:id | 4 | [ ] |
| POST /api/reports/:id/verify | 5 | [ ] |
| POST /api/reports/:id/changed | 5 | [ ] |
| POST /api/reports/:id/resolved | 5 | [ ] |
| POST /api/ai/analyze-voice-report | 7 | [ ] |
| POST /api/ai/analyze-image-report | 7 | [ ] |
| POST /api/ai/assistant | 7 | [ ] |
| POST /api/routes | 6 | [ ] |

---

# 14. DATA MODEL COVERAGE (REQUIREMENT.md §8)

| Entity | Fase | Status |
|--------|------|--------|
| User | 1 | [ ] |
| AccessibilityProfile | 1 | [ ] |
| Place | 2 | [ ] |
| Entrance | 2/3 | [ ] |
| AccessibilityFeature | 2 | [ ] |
| AccessibilityReport | 4 | [ ] |
| ReportMedia | 4 | [ ] |
| ReportVerification | 5 | [ ] |
| AccessibilityScore | 3 | [ ] |
| SavedPlace | 8 | [ ] |

---

# 15. TALKBACK COVERAGE (TALKBACK.md)

## Tiga Sistem Audio (TALKBACK.md §3)

- [ ] TalkBack / Screen Reader — membaca & menavigasi interface.
- [ ] TTS BLINDSPOT — membacakan informasi yang diminta user.
- [ ] STT — mengubah suara user menjadi teks/perintah.
- [ ] Ketiganya bekerja bersama tanpa saling mengganggu (TALKBACK.md §4).

## Koeksistensi TalkBack + TTS (TALKBACK.md §6, §32)

- [ ] Normal interface → jangan autoplay TTS yang panjang; biarkan TalkBack membaca.
- [ ] User meminta audio → TTS boleh dijalankan.
- [ ] Critical information → announcement tepat, tanpa spam/audio tabrakan.

## Semantic HTML & ARIA (TALKBACK.md §7–8)

- [ ] Native HTML first; ARIA hanya saat diperlukan.
- [ ] Tombol pakai `<button>`, bukan `<div onclick>`.
- [ ] Heading pakai `<h1>`–`<h3>` sesuai hierarki.
- [ ] Navigasi pakai `<nav>`, konten pakai `<main>`, form pakai `<label>` + `<input>` + `<button>`.

## Struktur Halaman & Navigasi (TALKBACK.md §11–13)

- [ ] H1 = nama halaman; H2 = bagian utama; H3 = detail; tanpa lompatan.
- [ ] Landmark: `<header>`, `<nav>`, `<main>`, `<footer>`.
- [ ] Skip to Main Content tersedia.
- [ ] User dapat langsung menuju: navigation, main content, search, footer.

## Keyboard & Focus (TALKBACK.md §14–17)

- [ ] Semua fitur utama tanpa mouse (Tab, Shift+Tab, Enter, Space, Esc, Arrow).
- [ ] Focus terlihat, logis, tidak hilang, tidak berpindah tiba-tiba.
- [ ] Modal: fokus masuk & kembali ke trigger.
- [ ] Tidak ada keyboard trap (modal, sidebar, map control, dropdown).

## Map & List View (TALKBACK.md §19–20)

- [ ] Peta bukan satu-satunya sumber informasi.
- [ ] Accessible List View: nama, jarak, jenis, status.
- [ ] Jangan paksa TalkBack membaca puluhan marker tanpa struktur.
- [ ] Alternatif: nearby hazards, nearby accessible facilities, route info, filtered list.

## Live Announcements (TALKBACK.md §21–24)

- [ ] Dynamic state diumumkan via live region (polite/assertive).
- [ ] Jangan umumkan setiap perubahan kecil.
- [ ] Loading & selesai diumumkan ("Mencari lokasi." → "Pencarian selesai. X hasil ditemukan.").
- [ ] Error dapat dibaca ("Tidak dapat menemukan lokasi. Coba gunakan kata kunci lain.").
- [ ] Tidak hanya spinner/skeleton untuk loading.

## Forms (TALKBACK.md §25–26)

- [ ] Setiap input memiliki `<label>` terlihat; placeholder bukan label.
- [ ] Error form: jelaskan masalah + cara memperbaiki + screen reader dapat mengetahui.

## Voice & Audio (TALKBACK.md §27–32)

- [ ] Voice input punya alternatif teks.
- [ ] Microphone status accessible (Inactive / Listening), bukan hanya warna.
- [ ] TTS button label jelas ("Dengarkan Informasi" / "Pause Audio" / "Stop Audio").
- [ ] AudioManager terpusat: play, pause, stop, repeat, queue, priority, interrupt.
- [ ] TalkBack mendominasi interface; TTS hanya untuk info yang diminta / penting.

## Status Tidak Hanya Warna (TALKBACK.md §34)

- [ ] Kombinasi text + icon: ✓ Accessible / ⚠ Limited Access / ✕ Not Accessible / ? Unavailable.
- [ ] Warna hanya pelengkap, bukan satu-satunya informasi.

## Images & Photo Report (TALKBACK.md §35–36)

- [ ] Gambar bermakna punya alt text deskriptif.
- [ ] Gambar dekoratif tidak dibacakan sebagai info penting.
- [ ] Photo report: "Foto hambatan dipilih" → "Analisis sedang berlangsung" → "Analisis selesai"; foto dapat dihapus.

## Modal & Dialog (TALKBACK.md §37–38)

- [ ] Focus masuk ke modal; background tidak dapat diakses.
- [ ] Modal punya judul; user dapat menutup; focus kembali ke trigger.
- [ ] Dialog labeling ("Laporkan hambatan, dialog.").

## Pengujian (TALKBACK.md §39–42)

- [ ] Mobile-first dengan Google TalkBack (Android).
- [ ] Desktop screen reader (keyboard, semantic, focus).
- [ ] TalkBack Core User Flow Test: Open, Search, Accessibility Info, Start Navigation, Voice Report.
- [ ] Acceptance criteria: Navigation, Keyboard, Screen Reader, Map, Audio, Voice.

---

# 16. NORTH STAR CHECKLIST (MAIN.md)

## North Star Experience

- [ ] User membuka BLINDSPOT.
- [ ] Memilih kebutuhan aksesibilitas.
- [ ] Sistem mempersonalisasi pengalaman.
- [ ] User menyebutkan/mencari tujuan.
- [ ] Sistem memberikan informasi aksesibilitas.
- [ ] User mengetahui hambatan yang mungkin ada.
- [ ] Sistem memberikan rekomendasi rute.
- [ ] User mendapat informasi selama perjalanan.
- [ ] User dapat melaporkan kondisi baru.
- [ ] Data komunitas menjadi lebih baik.

## Audio Quality (MAIN.md §6–12)

- [ ] Audio cepat merespons (native TTS untuk feedback cepat).
- [ ] Audio singkat, jelas, relevan, dapat dihentikan, dapat diulang.
- [ ] Audio tidak bertabrakan (AudioManager + Queue + Priority).
- [ ] Peringatan penting tidak tertutup informasi biasa.
- [ ] Tidak memaksa audio jika user sudah pakai screen reader.

## Speech-to-Text (MAIN.md §13–15)

- [ ] Start listening segera setelah permission.
- [ ] Interim/partial transcript bila didukung.
- [ ] Final transcript sesegera mungkin.
- [ ] Command sederhana via parsing lokal (tanpa LLM).

## Demo Story (MAIN.md §32)

- [ ] PROBLEM: "Rute tercepat belum tentu paling mudah diakses."
- [ ] PERSONALIZATION: pilih profil.
- [ ] DISCOVERY: cari tujuan.
- [ ] UNDERSTANDING: kondisi relevan.
- [ ] DECISION: bantu pilih rute.
- [ ] JOURNEY: info selama perjalanan.
- [ ] CONTRIBUTION: temukan hambatan baru.
- [ ] VOICE: lapor dengan suara.
- [ ] AI: menstrukturkan laporan.
- [ ] COMMUNITY: info kembali ke ekosistem.

---

# 17. CATATAN IMPLEMENTASI

## Bahasa & Microcopy

- UI dapat menggunakan Bahasa Indonesia sebagai bahasa utama (mengikuti dokumen & target user) dengan konsistensi istilah teknis.
- Tone: friendly, respectful, calm, helpful (DESIGN.md §47).
- Skrip announcement (Indonesia, singkat, jelas): "Mencari lokasi.", "Pencarian selesai. X hasil ditemukan.", "Laporan berhasil dikirim.", "Mikrofon aktif. Silakan berbicara.", "Transkripsi selesai." (TALKBACK.md §21–24, §28).

## Integrasi Eksternal

- Map provider, TTS/STT, dan AI service menyesuaikan ketersediaan & budget.
- Jika API eksternal tidak tersedia saat pengembangan, gunakan **mock/dev fallback yang DIBERI LABEL JELAS** (RULE 1) — jangan presentasikan sebagai data nyata.

## Kejujuran Data (MAIN.md §25)

- Selalu bedakan: Verified / Community Reported / Unknown.
- Jangan pernah menyamarkan "Unknown" menjadi "Accessible".

## TALKBACK.md Sebagai Requirement Wajib

- Prinsip: **Informasi harus dapat dipahami tanpa bergantung pada penglihatan** (TALKBACK.md §44).
- DoD TalkBack: pengguna tunanetra benar-benar dapat menyelesaikan core journey dengan screen reader — bukan sekadar ada aria-label / skor Lighthouse tinggi (TALKBACK.md §43).

---

# END OF ROADMAP.md
