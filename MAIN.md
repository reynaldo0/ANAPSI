# BLINDSPOT — MAIN.md

> **Dokumen Utama / North Star Product Document**  
> Dokumen ini adalah acuan tertinggi untuk tujuan akhir pengembangan BLINDSPOT.  
> REQUIREMENT.md menjelaskan apa yang harus dibangun.  
> DESIGN.md menjelaskan bagaimana pengalaman dan tampilannya.  
> MAIN.md menjelaskan **hasil akhir seperti apa yang wajib dicapai**.

---

# 1. TUJUAN AKHIR BLINDSPOT

BLINDSPOT harus menjadi sebuah platform aksesibilitas digital yang benar-benar membantu pengguna disabilitas memahami kondisi lingkungan sebelum dan selama melakukan perjalanan.

Tujuan akhirnya bukan sekadar membuat website dengan:

- peta,
- chatbot,
- tombol audio,
- AI,
- atau fitur pelaporan.

BLINDSPOT harus menghasilkan pengalaman nyata:

> **Pengguna dapat mengetahui hambatan yang mungkin dihadapi, memahami informasi dengan cara yang sesuai dengan kebutuhannya, dan mengambil keputusan perjalanan dengan lebih mandiri.**

Fokus utama BLINDSPOT adalah:

1. 👁️ **Tunanetra**
2. ♿ **Tunadaksa, terutama pengguna kursi roda**

---

# 2. NORTH STAR EXPERIENCE

Ketika seseorang membuka BLINDSPOT, pengalaman idealnya adalah:

```text
PENGGUNA MEMBUKA BLINDSPOT
            ↓
MEMILIH KEBUTUHAN AKSESIBILITAS
            ↓
SISTEM MEMPERSONALISASI PENGALAMAN
            ↓
PENGGUNA MENYEBUTKAN / MENCARI TUJUAN
            ↓
SISTEM MEMBERIKAN INFORMASI AKSESIBILITAS
            ↓
PENGGUNA MENGETAHUI HAMBATAN YANG MUNGKIN ADA
            ↓
SISTEM MEMBERIKAN REKOMENDASI RUTE
            ↓
PENGGUNA MENDAPATKAN INFORMASI SELAMA PERJALANAN
            ↓
PENGGUNA DAPAT MELAPORKAN KONDISI BARU
            ↓
DATA KOMUNITAS MENJADI LEBIH BAIK
```

Semua fitur harus mendukung alur utama tersebut.

Jika sebuah fitur tidak membantu alur ini, fitur tersebut tidak boleh menjadi prioritas utama.

---

# 3. DEFINISI PRODUK YANG BERHASIL

BLINDSPOT dianggap berhasil jika pengguna dapat menjawab tiga pertanyaan berikut dengan cepat:

### 1. Apakah tempat tujuan saya dapat diakses?

### 2. Hambatan apa yang mungkin saya temui?

### 3. Apa pilihan terbaik yang bisa saya lakukan sekarang?

Untuk tunanetra, pertanyaan tersebut harus dapat dijawab **tanpa bergantung pada kemampuan melihat layar**.

Untuk pengguna kursi roda, pertanyaan tersebut harus dapat dijawab **tanpa harus menebak kondisi fisik jalur atau bangunan**.

---

# 4. PRIORITAS UTAMA PRODUK

Prioritas pengembangan BLINDSPOT adalah:

```text
1. ACCESSIBILITY
        ↓
2. REAL USABILITY
        ↓
3. SPEED & RESPONSIVENESS
        ↓
4. RELIABILITY
        ↓
5. CLARITY
        ↓
6. BEAUTIFUL UI
        ↓
7. ADVANCED FEATURES
```

Agent tidak boleh membalik urutan ini.

Contoh yang salah:

> Membuat UI sangat keren tetapi navigasi keyboard tidak berfungsi.

Contoh yang benar:

> Core accessibility dan interaksi berfungsi dengan sangat baik, kemudian dipoles menjadi modern dan menarik.

---

# 5. TUJUAN UTAMA UNTUK TUNANETRA

Ini adalah bagian paling kritis dari BLINDSPOT.

Pengalaman tunanetra tidak boleh hanya berupa:

> "Website biasa yang ditambahkan tombol speaker."

BLINDSPOT harus dirancang sebagai pengalaman yang benar-benar **audio-first dan screen-reader friendly**.

Target pengalaman:

> **Pengguna tunanetra harus dapat menggunakan fitur inti BLINDSPOT secara mandiri melalui kombinasi screen reader, audio feedback, keyboard, dan interaksi suara yang cepat.**

---

# 6. AUDIO-FIRST EXPERIENCE

Untuk mode Visual Navigation, audio adalah bagian dari pengalaman utama.

Sistem harus mampu memberikan:

- Informasi tujuan.
- Ringkasan aksesibilitas.
- Informasi hambatan.
- Instruksi perjalanan.
- Peringatan hambatan penting.
- Konfirmasi aksi pengguna.
- Informasi berikutnya secara jelas.

Namun audio tidak boleh terus-menerus berbicara tanpa kontrol.

Audio harus:

- relevan,
- singkat,
- jelas,
- dapat dihentikan,
- dapat diulang.

---

# 7. TARGET AUDIO EXPERIENCE

## 7.1 Audio Harus Cepat Merespons

Saat pengguna menekan:

> 🔊 Dengarkan Informasi

respon audio harus terasa langsung.

Target UX:

```text
USER ACTION
     ↓
INSTANT UI FEEDBACK
     ↓
AUDIO STARTS AS QUICKLY AS POSSIBLE
```

Agent harus menghindari arsitektur:

```text
Klik tombol
↓
Kirim request panjang
↓
Menunggu AI
↓
Generate seluruh audio
↓
Baru audio dimulai
```

untuk informasi sederhana.

---

# 8. STRATEGI AUDIO AGAR MINIM DELAY

Untuk konten yang sudah tersedia dalam bentuk teks, gunakan strategi yang memprioritaskan kecepatan.

## Prioritas 1 — Native / Browser TTS untuk Feedback Cepat

Gunakan kemampuan Text-to-Speech yang tersedia di perangkat/browser jika sesuai dengan kebutuhan platform.

Cocok untuk:

- UI feedback.
- Instruksi pendek.
- Konfirmasi.
- Informasi sederhana.
- Pengulangan cepat.

Keuntungan:

- Tidak perlu menunggu proses AI.
- Tidak perlu upload audio.
- Respons terasa lebih cepat.

---

## Prioritas 2 — Pre-generated / Cached Audio

Untuk informasi yang sering digunakan:

- Journey brief.
- Instruksi tertentu.
- Informasi lokasi populer.

Sistem dapat melakukan caching atau pre-generation sesuai arsitektur yang digunakan.

Tujuannya:

> Jangan membuat pengguna menunggu proses yang sebenarnya bisa disiapkan sebelumnya.

---

## Prioritas 3 — Streaming untuk Audio Dinamis

Untuk output yang panjang atau dihasilkan secara dinamis:

- Gunakan streaming jika provider mendukung.
- Mulai memutar output ketika bagian awal sudah tersedia.
- Jangan selalu menunggu seluruh respons selesai.

---

# 9. AUDIO LATENCY PRINCIPLE

Tidak semua audio dapat dijamin memiliki latency yang sama karena bergantung pada:

- Browser.
- Device.
- Network.
- Provider TTS.
- Panjang konten.

Karena itu agent tidak boleh membuat klaim palsu seperti:

> "0 ms delay."

Target yang benar adalah:

> **Minimize perceived latency and start feedback immediately whenever possible.**

Pengalaman pengguna harus terasa:

- cepat,
- responsif,
- tidak membingungkan.

---

# 10. AUDIO FEEDBACK RULES

Setiap audio interaction harus memiliki aturan.

## Jika Audio Sedang Berjalan

Pengguna harus dapat:

- Pause.
- Stop.
- Repeat.

## Jika Instruksi Baru Lebih Penting

Audio lama dapat dihentikan secara terkontrol.

Contoh:

```text
Audio sedang menjelaskan informasi umum
        ↓
Ada peringatan navigasi penting
        ↓
Audio lama dihentikan
        ↓
Peringatan penting diprioritaskan
```

Jangan membuat beberapa audio berbicara bersamaan.

---

# 11. AUDIO PRIORITY SYSTEM

Gunakan prioritas:

```text
PRIORITY 1
Critical Warning

PRIORITY 2
Navigation Instruction

PRIORITY 3
User Requested Information

PRIORITY 4
General UI Feedback
```

Jika dua audio muncul bersamaan:

- Audio dengan prioritas lebih tinggi menang.
- Audio prioritas lebih rendah dapat dihentikan atau diantrikan.

---

# 12. AUDIO QUEUE REQUIREMENT

BLINDSPOT harus memiliki sistem pengelolaan audio terpusat.

Jangan membiarkan setiap component membuat audio sendiri tanpa koordinasi.

Recommended architecture:

```text
Audio Manager
      │
      ├── Priority System
      ├── Queue
      ├── Current Playback
      ├── Interrupt Control
      ├── Pause
      ├── Stop
      └── Repeat
```

Tujuan:

- Tidak ada audio bertabrakan.
- Tidak ada dua suara berbicara bersamaan.
- Peringatan penting tidak tertutup oleh informasi biasa.

---

# 13. TARGET SPEECH-TO-TEXT EXPERIENCE

Speech-to-Text harus digunakan terutama untuk membantu pengguna memberikan input dengan cepat.

Contoh:

> "Cari Universitas Negeri Jakarta."

atau:

> "Ada guiding block yang rusak di depan gedung."

Pengalaman yang diharapkan:

```text
USER SPEAKS
     ↓
SYSTEM STARTS LISTENING IMMEDIATELY
     ↓
LIVE / FAST TRANSCRIPTION APPEARS
     ↓
USER STOPS SPEAKING
     ↓
FINAL TRANSCRIPT
     ↓
USER CONFIRMS
```

---

# 14. SPEECH-TO-TEXT HARUS TERASA REAL-TIME

Untuk pengalaman terbaik, sistem harus memprioritaskan:

- Streaming speech recognition jika tersedia.
- Interim transcript.
- Partial result.
- Final result setelah pengguna selesai berbicara.

Jangan menggunakan pengalaman:

```text
Record 30 seconds
↓
Upload entire audio
↓
Wait several seconds
↓
Get transcript
```

sebagai satu-satunya metode utama jika ada opsi streaming.

Pengalaman tersebut terlalu terasa lambat untuk interaksi utama.

---

# 15. LATENCY TARGET UNTUK UX

Target berikut adalah target desain/performa pengalaman pengguna, bukan jaminan absolut pada semua perangkat dan jaringan.

## UI Feedback

Target:

> Terasa instan.

## Start Listening

Target:

> Dimulai segera setelah permission tersedia.

## Interim Transcript

Target:

> Muncul selama pengguna berbicara jika teknologi mendukung.

## Final Transcript

Target:

> Muncul sesegera mungkin setelah speech selesai.

## Audio UI Feedback

Target:

> Tidak terasa menunggu.

## Critical Navigation Warning

Target:

> Diprioritaskan dan disampaikan segera setelah event tersedia.

---

# 16. CRITICAL RULE: NO UNNECESSARY AI ROUNDTRIP

Agent tidak boleh menggunakan LLM untuk setiap interaksi suara.

Contoh yang salah:

```text
USER:
"Cari UNJ"

↓ Send audio to STT
↓ Send transcript to LLM
↓ Wait LLM
↓ LLM understands search
↓ Send result
```

Jika intent dapat ditangani secara sederhana, gunakan parsing lokal/application logic.

Contoh:

```text
USER:
"Cari UNJ"

↓ STT
↓ Search Query
↓ Search Places
```

LLM hanya digunakan ketika benar-benar diperlukan.

Ini penting untuk:

- Kecepatan.
- Biaya.
- Reliability.
- UX.

---

# 17. VOICE COMMAND ARCHITECTURE

Gunakan pendekatan:

```text
VOICE INPUT
     ↓
SPEECH-TO-TEXT
     ↓
INTENT DETECTION
     ↓
FAST COMMAND ROUTER
     ↓
APPLICATION ACTION
```

Command sederhana harus diproses secepat mungkin.

Contoh:

```text
"Ulangi"
→ Repeat Audio

"Berhenti"
→ Stop Audio

"Kembali"
→ Navigate Back

"Cari ..."
→ Search

"Laporkan hambatan"
→ Open Report Flow
```

Tidak perlu AI generatif untuk command-command sederhana.

---

# 18. VOICE FALLBACK

Voice tidak boleh menjadi satu-satunya cara menggunakan sistem.

Setiap fitur voice harus memiliki alternatif:

- Keyboard.
- Button.
- Touch.
- Screen reader navigation.

Contoh:

```text
🎙 Speak

OR

⌨ Type your report
```

---

# 19. SCREEN READER + AUDIO COEXISTENCE

Ini sangat penting.

BLINDSPOT harus kompatibel dengan screen reader.

Tetapi aplikasi juga memiliki audio sendiri.

Agent harus menghindari situasi:

```text
Screen Reader sedang membaca
+
BLINDSPOT TTS mulai otomatis
=
DUA AUDIO BERTABRAKAN
```

Aturan:

## Jangan autoplay informasi panjang tanpa alasan.

## Audio tambahan harus user-controlled kecuali peringatan penting.

## Berikan kontrol:

- Play.
- Pause.
- Stop.
- Repeat.

## Hindari memaksa audio jika pengguna sudah memakai screen reader.

---

# 20. SCREEN READER AS FIRST-CLASS EXPERIENCE

Semua fitur inti harus dapat digunakan dengan:

- Keyboard.
- Screen reader.

Target utama:

```text
Landing
↓
Profile Selection
↓
Search
↓
Place Detail
↓
Accessibility Information
↓
Route
↓
Report
```

Tidak boleh ada bagian penting yang hanya dapat diakses melalui gesture visual pada map.

---

# 21. TUNANETRA CORE EXPERIENCE

Berikut adalah pengalaman ideal yang wajib dapat didemokan:

```text
1. User membuka BLINDSPOT

2. User memilih Visual Navigation

3. Sistem mengonfirmasi mode yang aktif

4. User mencari tujuan
   melalui keyboard atau voice

5. Sistem menampilkan dan/atau membacakan
   ringkasan aksesibilitas

6. User mengetahui hambatan utama

7. User memilih rekomendasi rute

8. Sistem memberikan Journey Brief

9. User dapat meminta instruksi diulang

10. User dapat melaporkan hambatan
    melalui suara

11. Sistem melakukan speech-to-text

12. User memeriksa hasil

13. User mengonfirmasi laporan
```

Jika alur ini berjalan lancar, pengalaman tunanetra BLINDSPOT sudah memiliki nilai demonstrasi yang kuat.

---

# 22. TUJUAN UTAMA UNTUK TUNADAKSA

Untuk pengguna kursi roda, tujuan utama BLINDSPOT adalah mengurangi ketidakpastian.

Sebelum pergi, pengguna harus dapat mengetahui:

- Apakah ada ramp?
- Apakah ada tangga?
- Apakah jalurnya cukup lebar?
- Bagaimana kondisi permukaannya?
- Pintu masuk mana yang lebih memungkinkan?
- Hambatan apa yang dilaporkan komunitas?

---

# 23. WHEELCHAIR CORE EXPERIENCE

```text
Pilih Wheelchair Mobility
          ↓
Cari Tujuan
          ↓
Lihat Accessibility Score
          ↓
Lihat Ramp / Stairs / Surface
          ↓
Lihat Entrance Information
          ↓
Bandingkan Rute
          ↓
Pilih Rekomendasi
          ↓
Mulai Perjalanan
```

Pengguna tidak boleh dipaksa membaca informasi panjang untuk menemukan fakta penting.

Informasi utama harus muncul sebagai summary.

---

# 24. PERSONALIZATION IS THE CORE

BLINDSPOT tidak boleh memberikan pengalaman yang sama untuk semua orang.

Contoh tujuan:

```text
DESTINATION SAMA
        │
        ├── 👁 Visual Navigation
        │       → Guiding Block
        │       → Obstacles
        │       → Crossing
        │
        └── ♿ Wheelchair Mobility
                → Ramp
                → Stairs
                → Surface
                → Width
```

Satu data dunia.

Dua kebutuhan.

Dua cara memahami informasi.

---

# 25. DATA TRUST PRINCIPLE

BLINDSPOT harus jujur terhadap data.

Sistem harus membedakan:

### Verified

Informasi telah diverifikasi.

### Community Reported

Informasi berasal dari laporan komunitas.

### Unknown

Data belum tersedia atau belum cukup.

Jangan pernah menyamarkan:

> Unknown

menjadi:

> Accessible.

---

# 26. AI HARUS MEMPERCEPAT, BUKAN MEMPERLAMBAT

AI harus membantu:

- Menstrukturkan voice report.
- Membantu analisis foto.
- Merangkum data.
- Menjawab berdasarkan data yang tersedia.

AI tidak boleh:

- Menjadi bottleneck.
- Dipanggil untuk semua hal.
- Menggantikan application logic sederhana.
- Membuat informasi aksesibilitas.

Prinsip:

> **Use AI where intelligence adds value. Use deterministic logic where speed matters.**

---

# 27. CORE TECHNICAL PERFORMANCE PRINCIPLE

Untuk semua interaksi utama:

```text
USER ACTION
      ↓
IMMEDIATE LOCAL FEEDBACK
      ↓
BACKGROUND PROCESSING
      ↓
STREAM RESULT WHEN POSSIBLE
      ↓
UPDATE UI
```

Jangan:

```text
USER ACTION
      ↓
WAIT
      ↓
WAIT
      ↓
WAIT
      ↓
RESULT
```

UI harus selalu memberikan feedback bahwa sistem sedang bekerja.

---

# 28. PERCEIVED PERFORMANCE

BLINDSPOT harus terasa cepat.

Gunakan:

- Optimistic UI jika aman.
- Skeleton loading.
- Instant button feedback.
- Streaming.
- Caching.
- Prefetching jika relevan.
- Background processing.

Namun jangan menggunakan fake loading untuk membuat aplikasi terlihat sibuk.

---

# 29. CORE SUCCESS METRICS

## Accessibility

Pengguna dapat menyelesaikan core flow tanpa mouse.

## Audio

Audio tidak bertabrakan.

## Speech

Speech input memberikan feedback selama proses.

## Performance

Interaksi utama terasa responsif.

## Reliability

Error memiliki fallback.

## Data

Sistem jujur tentang tingkat kepastian informasi.

## UX

Pengguna selalu tahu apa langkah berikutnya.

---

# 30. ERROR TOLERANCE

BLINDSPOT harus tetap berguna ketika teknologi tertentu gagal.

Contoh:

## Speech Recognition Gagal

Fallback:

> Type your report instead.

## TTS Tidak Tersedia

Fallback:

> Screen-reader compatible text remains available.

## AI Gagal

Fallback:

> Manual report flow remains available.

## Location Permission Ditolak

Fallback:

> User can enter location manually.

---

# 31. OFFLINE / POOR NETWORK DIRECTION

Untuk MVP, offline penuh tidak wajib.

Namun sistem harus dirancang agar tidak langsung menjadi unusable ketika koneksi buruk.

Prioritas:

- Cache static assets.
- Cache recent data jika memungkinkan.
- Tampilkan data terakhir yang diketahui dengan timestamp.
- Jangan menyembunyikan fakta bahwa data mungkin sudah lama.

---

# 32. COMPETITION DEMO — THE PERFECT STORY

Demo terbaik BLINDSPOT:

## PART 1 — PROBLEM

> "Rute tercepat belum tentu menjadi rute yang paling mudah diakses."

## PART 2 — PERSONALIZATION

User memilih:

> 👁 Visual Navigation

atau:

> ♿ Wheelchair Mobility

## PART 3 — DISCOVERY

User mencari tujuan.

## PART 4 — UNDERSTANDING

BLINDSPOT menunjukkan kondisi yang relevan.

## PART 5 — DECISION

BLINDSPOT membantu memilih rute.

## PART 6 — JOURNEY

User mendapatkan informasi selama perjalanan.

## PART 7 — CONTRIBUTION

User menemukan hambatan baru.

## PART 8 — VOICE

User melaporkan hambatan dengan suara.

## PART 9 — AI

AI membantu menstrukturkan laporan.

## PART 10 — COMMUNITY

Informasi kembali ke ekosistem dan membantu pengguna berikutnya.

---

# 33. FINAL DEMO MOMENT FOR TUNANETRA

Ini harus menjadi salah satu momen terkuat saat presentasi.

```text
USER:
"Laporkan hambatan."

SYSTEM:
Mulai mendengarkan.

USER:
"Guiding block di depan gedung tertutup material konstruksi."

SYSTEM:
Menampilkan transkrip secara cepat.

SYSTEM:
"Kami mendeteksi hambatan pada guiding block.
Apakah informasi ini benar?"

USER:
"Benar."

SYSTEM:
Laporan berhasil dibuat.
```

Catatan penting:

Sistem harus memberikan feedback cepat dan jelas.

Bukan sekadar menampilkan animasi AI.

---

# 34. FINAL PRODUCT CHECKLIST

BLINDSPOT belum boleh dianggap selesai jika salah satu core experience berikut belum bekerja.

## 👁 Tunanetra

- [ ] Website dapat dinavigasi dengan keyboard.
- [ ] Website kompatibel dengan screen reader.
- [ ] Informasi penting tersedia dalam teks terstruktur.
- [ ] TTS dapat digunakan untuk informasi penting.
- [ ] Audio tidak bertabrakan.
- [ ] Audio dapat dihentikan.
- [ ] Audio dapat diulang.
- [ ] Voice input tersedia.
- [ ] Speech-to-text memberikan feedback cepat.
- [ ] Voice report memiliki fallback manual.
- [ ] Map memiliki alternative list view.

## ♿ Tunadaksa

- [ ] Accessibility profile dapat dipilih.
- [ ] Ramp dapat ditampilkan.
- [ ] Tangga dapat ditampilkan.
- [ ] Surface condition dapat ditampilkan.
- [ ] Entrance information tersedia.
- [ ] Accessibility score tersedia.
- [ ] Route information disesuaikan dengan profile.

## 🌍 Community

- [ ] User dapat membuat laporan.
- [ ] User dapat melihat laporan.
- [ ] Status laporan jelas.
- [ ] Community dapat memverifikasi kondisi.
- [ ] Data lama dapat ditandai outdated.

## 🤖 AI

- [ ] AI membantu tugas nyata.
- [ ] AI tidak menjadi bottleneck.
- [ ] AI output dapat diperiksa user.
- [ ] AI tidak mengarang data aksesibilitas.

---

# 35. DEFINITION OF THE FINAL PRODUCT

Pada akhirnya, BLINDSPOT bukan tentang:

> "Berapa banyak fitur yang ada?"

BLINDSPOT adalah tentang:

> **Seberapa mandiri pengguna dapat memahami dan menghadapi lingkungan menggunakan informasi yang tersedia.**

Produk akhir harus mampu membuat pengalaman berikut menjadi nyata:

```text
SAYA INGIN PERGI
       ↓
SAYA TAHU KONDISINYA
       ↓
SAYA TAHU HAMBATANNYA
       ↓
SAYA TAHU PILIHAN SAYA
       ↓
SAYA BISA MELANJUTKAN PERJALANAN
```

---

# 36. THE FINAL NORTH STAR

Semua keputusan desain, fitur, teknologi, AI, audio, dan UX harus menjawab satu pertanyaan:

> **"Apakah ini benar-benar membuat pengguna lebih mandiri dalam memahami dan menjalani perjalanan?"**

Jika jawabannya:

> Tidak.

Maka fitur tersebut harus dipertimbangkan ulang.

---

# 37. FINAL INSTRUCTION FOR THE AGENT

Bangun BLINDSPOT dengan prinsip:

```text
ACCESSIBILITY IS NOT A FEATURE.
ACCESSIBILITY IS THE PRODUCT.
```

Prioritas akhir:

```text
REAL USER EXPERIENCE
        ↓
FAST RESPONSE
        ↓
AUDIO-FIRST EXPERIENCE
        ↓
RELIABLE INFORMATION
        ↓
PERSONALIZED ACCESSIBILITY
        ↓
MODERN FRIENDLY DESIGN
```

Untuk mode tunanetra:

> Audio dan voice interaction harus terasa cepat, responsif, terkontrol, dan tidak saling bertabrakan.

Untuk Speech-to-Text:

> Prioritaskan streaming/interim transcription bila teknologi memungkinkan, berikan feedback langsung, dan hindari roundtrip AI yang tidak diperlukan.

Untuk Text-to-Speech:

> Prioritaskan respons cepat, audio queue terpusat, interruption management, caching bila relevan, dan kontrol penuh kepada pengguna.

Jangan menjanjikan latency absolut yang tidak dapat dijamin oleh jaringan atau perangkat.

Target sebenarnya adalah:

> **The fastest possible, lowest perceived latency, reliable accessibility experience.**

---

# END OF MAIN.md
