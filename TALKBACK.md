# TALKBACK.md

# BLINDSPOT — TALKBACK & SCREEN READER ACCESSIBILITY REQUIREMENTS

> **Purpose:**  
> Dokumen ini menjadi panduan khusus untuk memastikan BLINDSPOT benar-benar dapat digunakan oleh pengguna tunanetra melalui screen reader, terutama **Google TalkBack** pada perangkat Android/mobile.

---

# 1. TUJUAN DOKUMEN

BLINDSPOT memiliki fokus utama pada pengguna:

- 👁️ Tunanetra
- ♿ Tunadaksa

Untuk pengguna tunanetra, aksesibilitas tidak boleh dianggap sebagai fitur tambahan.

TalkBack dan screen reader adalah bagian dari **core user experience**.

Tujuan utama implementasi ini adalah:

> **Pengguna tunanetra harus dapat memahami, menavigasi, dan menggunakan fitur utama BLINDSPOT secara mandiri tanpa bergantung pada informasi visual.**

BLINDSPOT tidak boleh menjadi website yang:

> "Terlihat bagus untuk pengguna yang dapat melihat, lalu sekadar ditambahkan ARIA label."

Aksesibilitas harus menjadi bagian dari struktur aplikasi sejak awal.

---

# 2. APA ITU TALKBACK DALAM KONTEKS BLINDSPOT?

TalkBack adalah screen reader yang digunakan pengguna Android untuk:

- Membaca teks.
- Mengidentifikasi tombol.
- Menjelaskan elemen interface.
- Memberikan informasi status.
- Membantu navigasi aplikasi atau website.

Dalam konteks BLINDSPOT:

```text
USER INTERACTS WITH WEBSITE
            ↓
TALKBACK READS THE INTERFACE
            ↓
USER UNDERSTANDS AVAILABLE ACTIONS
            ↓
USER ACTIVATES AN ACTION
            ↓
BLINDSPOT PROVIDES ACCESSIBLE FEEDBACK
```

TalkBack bertugas membantu pengguna memahami **interface**.

TalkBack bukan pengganti seluruh sistem audio BLINDSPOT.

---

# 3. TIGA SISTEM AUDIO YANG HARUS DIBEDAKAN

BLINDSPOT memiliki tiga konsep berbeda:

## A. 📱 TALKBACK / SCREEN READER

Fungsi:

> Membantu pengguna memahami dan menavigasi interface.

Contoh:

> "Cari lokasi, tombol."

> "Mulai navigasi, tombol."

> "Aksesibilitas tujuan, heading."

---

## B. 🔊 TEXT-TO-SPEECH BLINDSPOT

Fungsi:

> Membacakan informasi khusus yang diminta atau dibutuhkan pengguna.

Contoh:

> "Di depan terdapat guiding block yang dilaporkan rusak."

> "Tujuan berada 250 meter dari lokasi Anda."

---

## C. 🎙️ SPEECH-TO-TEXT

Fungsi:

> Mengubah suara pengguna menjadi teks atau perintah.

Contoh:

User berkata:

> "Cari rumah sakit terdekat."

Sistem:

> Mengubah suara menjadi teks dan menjalankan pencarian.

---

# 4. PRINSIP UTAMA

```text
TALKBACK
MEMBACA INTERFACE

TTS
MEMBACA INFORMASI / NAVIGASI

STT
MEMAHAMI INPUT SUARA USER
```

Ketiganya harus bekerja bersama.

Namun tidak boleh saling mengganggu.

---

# 5. MASALAH PALING PENTING: AUDIO BERTABRAKAN

Contoh yang salah:

```text
TalkBack:
"Mulai navigasi, tombol"

BERSAMAAN DENGAN

BLINDSPOT TTS:
"Perjalanan dimulai..."
```

Hasil:

❌ Dua suara berbicara bersamaan.

❌ Pengguna bingung.

❌ Informasi tidak dapat dipahami.

---

# 6. TALKBACK + TTS COEXISTENCE RULE

BLINDSPOT harus mengikuti prinsip:

> **Jangan memutar audio otomatis yang panjang ketika pengguna sedang menggunakan screen reader.**

Untuk informasi biasa:

- Biarkan TalkBack membaca interface.
- Jangan memaksa TTS BLINDSPOT.

Untuk informasi yang diminta pengguna:

- User dapat memilih tombol "Dengarkan".
- Sistem dapat memutar TTS.

Untuk kondisi penting:

- Gunakan mekanisme announcement yang tepat.
- Jangan membuat beberapa audio berjalan bersamaan.

---

# 7. CORE RULE: SEMANTIC HTML FIRST

Untuk website BLINDSPOT, aksesibilitas harus dimulai dari struktur HTML yang benar.

Gunakan elemen native sesuai fungsinya.

Contoh:

## Button

Gunakan:

```html
<button>Mulai Navigasi</button>
```

Jangan menggunakan:

```html
<div onclick="...">Mulai Navigasi</div>
```

---

## Heading

Gunakan struktur:

```html
<h1>BLINDSPOT</h1>
<h2>Tujuan Anda</h2>
<h3>Informasi Aksesibilitas</h3>
```

Jangan menggunakan `<div>` hanya untuk membuat teks terlihat seperti heading.

---

## Navigation

Gunakan:

```html
<nav>
```

---

## Main Content

Gunakan:

```html
<main>
```

---

## Forms

Gunakan:

- `<label>`
- `<input>`
- `<button>`
- `<fieldset>`
- `<legend>`

sesuai kebutuhan.

---

# 8. ARIA RULE

ARIA bukan pengganti semantic HTML.

Aturan:

> **Use native HTML first. Use ARIA only when necessary.**

Jangan menambahkan ARIA secara berlebihan.

Contoh yang benar:

```html
<button aria-label="Mulai navigasi ke Universitas Negeri Jakarta">
  Mulai Navigasi
</button>
```

Gunakan ARIA untuk memberikan informasi tambahan yang memang dibutuhkan screen reader.

---

# 9. BUTTON REQUIREMENTS

Setiap tombol harus memiliki nama yang jelas.

Contoh buruk:

> "Klik di sini"

> "Lihat"

> "More"

Contoh baik:

> "Mulai navigasi"

> "Dengarkan informasi aksesibilitas"

> "Laporkan hambatan"

> "Buka daftar lokasi"

TalkBack harus dapat menjelaskan:

```text
APA ELEMENNYA
+
APA FUNGSINYA
```

---

# 10. ICON BUTTON REQUIREMENTS

Jika tombol hanya menggunakan icon, wajib memiliki accessible name.

Contoh:

```text
🔊
```

Tidak cukup.

TalkBack harus mengetahui bahwa tombol tersebut berarti:

> "Dengarkan informasi."

Gunakan accessible label yang jelas.

Contoh:

```text
aria-label="Dengarkan informasi aksesibilitas"
```

---

# 11. HEADING NAVIGATION

Struktur heading sangat penting.

TalkBack dan screen reader memungkinkan pengguna berpindah antar heading.

Struktur ideal:

```text
H1 — Nama Halaman

H2 — Bagian Utama

H3 — Detail Bagian
```

Jangan melompati struktur tanpa alasan.

Contoh buruk:

```text
H1
↓
H4
↓
H2
```

---

# 12. LANDMARK NAVIGATION

Halaman harus memiliki struktur yang mudah dipahami:

```text
<header>
<nav>
<main>
<footer>
```

Jika halaman kompleks, gunakan landmark yang relevan.

Tujuan:

Pengguna screen reader dapat langsung menuju:

- Navigation.
- Main content.
- Search.
- Footer.

---

# 13. SKIP TO CONTENT

BLINDSPOT harus memiliki:

> Skip to Main Content

Fitur ini memungkinkan pengguna keyboard dan screen reader melewati navigasi yang berulang.

Alur:

```text
PAGE LOAD
    ↓
SKIP TO MAIN CONTENT
    ↓
USER ENTERS MAIN CONTENT
```

---

# 14. KEYBOARD NAVIGATION

Semua fitur utama wajib dapat digunakan tanpa mouse.

User harus dapat menggunakan:

```text
TAB
SHIFT + TAB
ENTER
SPACE
ESC
ARROW KEYS
```

sesuai konteks komponen.

---

# 15. FOCUS MANAGEMENT

Focus harus selalu:

- Terlihat.
- Logis.
- Tidak hilang.
- Tidak berpindah secara tiba-tiba.

Contoh:

User membuka modal:

```text
User activates Report button
        ↓
Modal opens
        ↓
Focus moves into modal
```

Ketika modal ditutup:

```text
Modal closes
        ↓
Focus returns to Report button
```

---

# 16. JANGAN ADA KEYBOARD TRAP

User tidak boleh terjebak di:

- Modal.
- Sidebar.
- Map control.
- Dropdown.

User harus selalu dapat keluar menggunakan keyboard.

---

# 17. FOCUS ORDER

Urutan focus harus mengikuti urutan logis interface.

Contoh:

```text
Search
↓
Search Result
↓
Accessibility Summary
↓
Start Navigation
```

Bukan:

```text
Search
↓
Footer
↓
Random Button
↓
Search Result
```

---

# 18. TALKBACK REQUIREMENTS UNTUK NAVIGATION

User harus dapat mengetahui:

- Halaman apa yang sedang dibuka.
- Lokasi mana yang dipilih.
- Apa status aksesibilitasnya.
- Tombol apa yang tersedia.
- Apa tindakan berikutnya.

Contoh informasi:

```text
Universitas Negeri Jakarta

Accessibility information.

Wheelchair accessibility:
Limited access.

Main entrance:
Ramp available.

Last verified:
Community reported.
```

Informasi harus memiliki urutan yang masuk akal.

---

# 19. ACCESSIBILITY MAP RULE

Peta visual tidak boleh menjadi satu-satunya sumber informasi.

Setiap data penting pada map wajib tersedia dalam:

# ACCESSIBLE LIST VIEW

Contoh:

```text
Nearby accessibility information

1. Damaged guiding block
Distance: 120 meters

2. Ramp available
Distance: 250 meters

3. Uneven surface
Distance: 400 meters
```

Pengguna tunanetra harus dapat memahami informasi tanpa melihat map.

---

# 20. MAP SCREEN READER REQUIREMENT

Jangan memaksa TalkBack membaca puluhan marker satu per satu tanpa struktur.

Gunakan alternatif:

- Nearby hazards.
- Nearby accessible facilities.
- Route information.
- Filtered list.

Map harus menjadi enhancement visual.

Bukan satu-satunya interface.

---

# 21. LIVE ANNOUNCEMENTS

Informasi dinamis harus diumumkan dengan hati-hati.

Contoh:

> "Pencarian selesai. 5 lokasi ditemukan."

> "Laporan berhasil dikirim."

> "Lokasi berhasil diperbarui."

Gunakan live region secara tepat.

Namun:

❌ Jangan mengumumkan setiap perubahan kecil.

❌ Jangan membuat screen reader terus berbicara.

---

# 22. LIVE REGION PRIORITY

Gunakan konsep:

## Informasi biasa

Gunakan announcement yang tidak mengganggu.

## Informasi penting

Gunakan announcement yang lebih jelas dan diprioritaskan.

Contoh penting:

- Error kritis.
- Navigasi gagal.
- Action berhasil.
- Warning penting.

---

# 23. LOADING STATE

Screen reader harus mengetahui ketika proses sedang berjalan.

Contoh:

> "Mencari lokasi."

Setelah selesai:

> "Pencarian selesai. 8 hasil ditemukan."

Jangan hanya menggunakan:

- Spinner.
- Skeleton.

karena itu hanya visual.

---

# 24. ERROR STATE

Error harus dapat dibaca dengan jelas.

Contoh:

> "Tidak dapat menemukan lokasi. Coba gunakan kata kunci lain."

Jangan hanya menampilkan:

❌ Icon merah.

❌ Warna merah.

---

# 25. FORM REQUIREMENTS

Setiap input harus memiliki label.

Contoh:

```text
Tujuan perjalanan

[ Masukkan lokasi ]
```

Jangan hanya menggunakan placeholder:

```text
[ Masukkan lokasi ]
```

sebagai satu-satunya label.

---

# 26. FORM ERROR

Jika field memiliki error:

1. Jelaskan masalahnya.
2. Beritahu bagaimana memperbaikinya.
3. Pastikan screen reader dapat mengetahui error.

Contoh:

> "Lokasi belum diisi. Masukkan tujuan perjalanan."

---

# 27. VOICE INPUT ACCESSIBILITY

Voice input tidak boleh menjadi satu-satunya cara memberikan input.

Setiap fitur voice harus memiliki alternatif:

```text
🎙️ Bicara

ATAU

⌨️ Ketik
```

---

# 28. SPEECH-TO-TEXT FLOW

Alur ideal:

```text
USER ACTIVATES MICROPHONE
        ↓
SYSTEM CONFIRMS LISTENING STATE
        ↓
USER SPEAKS
        ↓
INTERIM TRANSCRIPT
        ↓
FINAL TRANSCRIPT
        ↓
USER CONFIRMS RESULT
```

Status harus dapat diakses screen reader.

Contoh:

> "Mikrofon aktif. Silakan berbicara."

> "Mendengarkan."

> "Transkripsi selesai."

---

# 29. MICROPHONE BUTTON

Tombol mikrofon harus memiliki status yang jelas.

Contoh:

```text
Microphone

Inactive
```

Ketika aktif:

```text
Microphone

Listening
```

Status tidak boleh hanya berubah warna.

TalkBack harus dapat mengetahui perubahan tersebut.

---

# 30. TTS BUTTON REQUIREMENTS

Tombol audio harus jelas.

Contoh:

> 🔊 Dengarkan Informasi

Ketika sedang berjalan:

> ⏸ Pause Audio

Atau:

> ⏹ Stop Audio

Status harus dapat dipahami tanpa melihat animasi.

---

# 31. AUDIO MANAGER INTEGRATION

BLINDSPOT harus memiliki Audio Manager terpusat.

Audio Manager bertanggung jawab atas:

```text
PLAY
PAUSE
STOP
REPEAT
QUEUE
PRIORITY
INTERRUPT
```

Tujuan:

- Audio tidak bertabrakan.
- Critical warning memiliki prioritas.
- User dapat mengontrol audio.

---

# 32. TALKBACK VS BLINDSPOT TTS PRIORITY

Aturan utama:

## Normal Interface

TalkBack memiliki peran utama untuk membaca interface.

BLINDSPOT tidak perlu membacakan semua teks lagi menggunakan TTS.

---

## User Requests Audio

BLINDSPOT dapat menjalankan TTS.

Contoh:

User menekan:

> "Dengarkan Journey Brief"

---

## Critical Information

Informasi penting dapat diberikan melalui mekanisme yang sesuai.

Namun jangan membuat spam audio.

---

# 33. DYNAMIC ROUTE INFORMATION

Ketika route berubah, pengguna harus mengetahui perubahan.

Contoh:

> "Rute diperbarui."

> "Terdapat hambatan baru yang dilaporkan pada rute."

Informasi tersebut harus:

- Jelas.
- Singkat.
- Tidak berulang.

---

# 34. ACCESSIBILITY STATUS MUST NOT RELY ON COLOR

Jangan menggunakan:

🟢 saja = accessible.

🔴 saja = inaccessible.

Gunakan kombinasi:

```text
✓ Accessible

⚠ Limited Access

✕ Not Accessible

? Information Unavailable
```

Warna boleh menjadi tambahan.

Bukan satu-satunya informasi.

---

# 35. IMAGE ACCESSIBILITY

Semua gambar yang bermakna harus memiliki alternative text yang sesuai.

Contoh:

```text
Photo:
Ramp menuju pintu masuk utama.
```

Jika gambar dekoratif:

- Tidak perlu dibacakan sebagai informasi penting.

---

# 36. PHOTO REPORT ACCESSIBILITY

Saat pengguna mengunggah foto hambatan:

TalkBack harus dapat memahami:

- Foto berhasil dipilih.
- Nama atau status file.
- Foto dapat dihapus.
- Foto sedang dianalisis.

Contoh:

> "Foto hambatan dipilih."

> "Analisis sedang berlangsung."

> "Analisis selesai."

---

# 37. MODAL REQUIREMENTS

Saat modal terbuka:

1. Focus masuk ke modal.
2. Background tidak dapat diakses secara tidak sengaja.
3. Modal memiliki judul.
4. User dapat menutup modal.
5. Focus kembali setelah modal ditutup.

---

# 38. DIALOG LABELING

Contoh:

> "Laporkan hambatan, dialog."

Ini membantu TalkBack memahami konteks.

---

# 39. MOBILE-FIRST TALKBACK TESTING

BLINDSPOT harus diuji pada pengalaman mobile.

Prioritas:

## Android

Test dengan:

> Google TalkBack

Fokus pengujian:

- Swipe navigation.
- Explore by touch.
- Double tap activation.
- Form interaction.
- Button labels.
- Dynamic announcements.

---

# 40. DESKTOP SCREEN READER TESTING

Untuk web desktop, lakukan pengujian dengan screen reader yang relevan.

Minimal pastikan:

- Keyboard navigation berfungsi.
- Semantic structure benar.
- Focus management benar.

Pengujian dapat dilakukan dengan screen reader desktop sesuai lingkungan pengembangan.

---

# 41. TALKBACK CORE USER FLOW TEST

Agent wajib memastikan alur berikut dapat digunakan dengan TalkBack.

## FLOW 1 — OPEN WEBSITE

```text
Open BLINDSPOT
↓
TalkBack identifies page title
↓
User navigates main navigation
↓
User reaches main content
```

---

## FLOW 2 — SEARCH LOCATION

```text
Navigate to Search
↓
TalkBack reads search label
↓
User enters destination
↓
Search results announced
↓
User selects destination
```

---

## FLOW 3 — ACCESSIBILITY INFORMATION

```text
Destination selected
↓
TalkBack reads location name
↓
Accessibility summary
↓
Ramp / guiding block / surface information
↓
Verification status
```

---

## FLOW 4 — START NAVIGATION

```text
User reaches Start Navigation
↓
TalkBack identifies button
↓
User activates button
↓
Navigation state announced
```

---

## FLOW 5 — VOICE REPORT

```text
User activates Report
↓
Select Voice Report
↓
Microphone status announced
↓
User speaks
↓
Transcript appears
↓
Transcript announced
↓
User confirms
↓
Report success announced
```

---

# 42. TALKBACK ACCEPTANCE CRITERIA

Fitur dianggap memenuhi requirement jika:

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

# 43. DEFINITION OF DONE

Implementasi TalkBack / Screen Reader belum dianggap selesai hanya karena:

❌ Ada aria-label.

❌ Lighthouse accessibility score tinggi.

❌ Website terlihat accessible.

Implementasi dianggap selesai jika:

> **Pengguna benar-benar dapat menyelesaikan core journey menggunakan screen reader.**

Core journey:

```text
OPEN
↓
SEARCH
↓
UNDERSTAND ACCESSIBILITY
↓
SELECT ROUTE
↓
START NAVIGATION
↓
REPORT BARRIER
```

---

# 44. FINAL PRINCIPLE

Jangan membangun BLINDSPOT untuk pengguna yang melihat layar, lalu mencoba membuatnya bisa digunakan oleh tunanetra.

Bangun BLINDSPOT dengan prinsip:

> **Informasi harus dapat dipahami tanpa bergantung pada penglihatan.**

Jika sebuah fitur hanya dapat dipahami dengan:

- melihat warna,
- melihat peta,
- melihat icon,
- melihat animasi,

maka fitur tersebut belum sepenuhnya accessible.

---

# 45. FINAL INSTRUCTION FOR AGENT

Saat mengimplementasikan BLINDSPOT:

1. Gunakan semantic HTML terlebih dahulu.
2. Pastikan semua elemen interaktif memiliki nama yang jelas.
3. Pastikan keyboard navigation berfungsi.
4. Kelola focus dengan benar.
5. Gunakan ARIA hanya ketika diperlukan.
6. Jangan membuat audio BLINDSPOT bertabrakan dengan screen reader.
7. Jangan menjadikan map satu-satunya sumber informasi.
8. Pastikan dynamic state dapat diumumkan.
9. Selalu sediakan fallback untuk voice interaction.
10. Uji core user journey menggunakan TalkBack.

Tujuan akhir:

> **Seorang pengguna tunanetra harus dapat menggunakan BLINDSPOT secara mandiri untuk mencari lokasi, memahami informasi aksesibilitas, memilih tindakan, menggunakan navigasi, dan melaporkan hambatan.**

---

# THE NORTH STAR

```text
NO VISION REQUIRED
TO UNDERSTAND THE EXPERIENCE.
```

Aksesibilitas bukan fitur tambahan.

> **Accessibility is the product.**

---

# END OF TALKBACK.md
