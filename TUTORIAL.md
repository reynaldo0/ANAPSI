## PROMPT — INTERACTIVE FEATURE TUTORIAL

Tolong tambahkan sistem **tutorial interaktif / guided tour** pada aplikasi ini.

Tujuannya adalah membuat pengguna baru dapat memahami setiap fitur dengan cara yang **interaktif, ringan, dan terasa seperti tutorial di dalam game**, bukan seperti membaca dokumentasi.

### KONSEP UTAMA

Ketika pengguna pertama kali membuka suatu fitur, tampilkan tutorial singkat yang langsung menjelaskan fitur tersebut sambil **menyorot/highlight bagian UI yang sedang dijelaskan**.

Konsep interaksi:

**Masuk fitur → Intro singkat → Highlight elemen → Penjelasan → Lanjut → Highlight berikutnya → Selesai**

Tutorial harus terasa seperti aplikasi sedang "memandu" pengguna.

Jangan membuat tutorial yang panjang.

---

# 1. INTRO FITUR

Saat pengguna pertama kali membuka sebuah fitur, tampilkan intro sederhana.

Contoh:

**👋 Kenalan dengan Laporan**

"Di sini kamu bisa membuat dan memantau laporan dengan mudah."

Button:

**Mulai Tutorial**

**Lewati**

Gunakan bahasa yang natural dan sederhana.

Jangan menggunakan copywriting AI yang berlebihan seperti:

> "Selamat datang di perjalanan transformasi digital Anda!"

Gunakan bahasa manusia yang langsung menjelaskan manfaat fitur.

---

# 2. HIGHLIGHT ELEMENT

Setelah pengguna menekan **Mulai Tutorial**, tampilkan overlay semi-transparan pada halaman.

Elemen yang sedang dijelaskan harus tetap terlihat jelas.

Contoh:

Overlay menutupi seluruh halaman.

Kemudian:

**[ Tombol Buat Laporan ]**

diberikan highlight/focus yang jelas.

Di dekat elemen tersebut tampil tooltip:

> **Buat Laporan**
>
> Gunakan tombol ini untuk membuat laporan baru.

Button:

**Kembali**
**Lanjut**

Area yang di-highlight harus tetap dapat dikenali dengan jelas.

---

# 3. SPOTLIGHT EFFECT

Gunakan konsep **spotlight / cutout**.

Contoh visual:

```text
┌──────────────────────────────┐
│                              │
│      halaman aplikasi        │
│                              │
│             ┌────────────┐   │
│             │ Buat       │   │
│             │ Laporan    │   │
│             └────────────┘   │
│                  ↑           │
│          ┌───────────────┐   │
│          │ Buat Laporan  │   │
│          │ Klik di sini  │   │
│          └───────────────┘   │
│                              │
└──────────────────────────────┘
```

Area yang di-highlight harus memiliki kontras yang cukup.

Jangan membuat spotlight terlalu menyilaukan.

---

# 4. TOOLTIP DINAMIS

Tooltip harus otomatis menyesuaikan posisi elemen.

Jika elemen berada di:

* atas → tooltip berada di bawah
* bawah → tooltip berada di atas
* kiri → tooltip berada di kanan
* kanan → tooltip berada di kiri

Jangan sampai tooltip keluar dari viewport.

Pada mobile, tooltip boleh berubah menjadi bottom sheet kecil jika posisi tooltip biasa tidak memungkinkan.

---

# 5. STEP INDICATOR

Berikan indikator progress yang sederhana.

Contoh:

**● ○ ○ ○**

atau:

**1 dari 4**

Contoh:

> **1 / 4**

Jangan membuat progress indicator terlalu besar.

Pengguna harus selalu tahu tutorialnya tinggal berapa langkah.

---

# 6. NAVIGASI TUTORIAL

Setiap step memiliki:

**Kembali**
**Lanjut**

Pada step terakhir:

**Selesai**

Sediakan juga:

**Lewati Tutorial**

Jika pengguna memilih "Lewati", tutorial langsung ditutup.

---

# 7. ANIMASI

Gunakan animasi ringan agar terasa seperti tutorial game.

Contoh:

* spotlight berpindah dengan smooth transition
* tooltip muncul dengan fade/slide ringan
* highlight sedikit melakukan pulse sekali saat pertama muncul

Tetapi jangan menggunakan animasi berlebihan.

Hindari:

* bouncing terus-menerus
* flashing
* neon glow
* animasi terlalu cepat
* efek 3D

Tambahkan dukungan:

`prefers-reduced-motion`

Jika pengguna mengaktifkan reduced motion, gunakan transisi minimal atau tanpa animasi.

---

# 8. TUTORIAL HARUS KONTEKSTUAL

Tutorial **harus menjelaskan fitur yang sedang dibuka**, bukan tutorial global yang tidak relevan.

Contoh:

Jika pengguna membuka **Laporan**:

Step 1:

> **Buat Laporan**
>
> Mulai laporan baru dari sini.

Step 2:

> **Kategori**
>
> Pilih kategori laporan agar laporan lebih mudah diproses.

Step 3:

> **Lokasi**
>
> Tambahkan lokasi kejadian agar laporan lebih mudah ditemukan.

Step 4:

> **Kirim**
>
> Setelah semua data lengkap, kirim laporan melalui tombol ini.

---

# 9. TUTORIAL PER FITUR

Buat sistem yang reusable sehingga setiap fitur dapat memiliki tutorialnya sendiri.

Contoh struktur:

```text
FeatureTutorial
 ├── Dashboard Tutorial
 ├── Laporan Tutorial
 ├── Tracking Tutorial
 ├── Profil Tutorial
 ├── Pengaturan Tutorial
 └── fitur lainnya
```

Jangan hardcode tutorial secara terpisah di setiap halaman jika dapat dibuat menggunakan konfigurasi/data.

Gunakan struktur seperti:

```text
steps:
  - target
  - title
  - description
  - placement
```

Sehingga tutorial dapat ditambahkan atau diubah tanpa mengubah banyak kode.

---

# 10. FIRST-TIME EXPERIENCE

Tutorial otomatis muncul ketika pengguna **pertama kali menggunakan fitur tersebut**.

Setelah tutorial selesai:

* simpan status tutorial sebagai completed
* jangan tampilkan tutorial setiap kali halaman dibuka

Contoh:

```text
tutorial.laporan.completed = true
```

Jika pengguna sudah pernah menyelesaikan tutorial, halaman langsung terbuka secara normal.

---

# 11. FITUR "LIHAT TUTORIAL LAGI"

Berikan opsi bagi pengguna untuk menjalankan tutorial kembali.

Contoh:

**Bantuan → Pelajari Fitur Ini**

atau:

**⋯ → Lihat Tutorial**

Jangan memaksa pengguna mengulang tutorial.

---

# 12. ACCESSIBILITY — WAJIB

Karena aplikasi harus dapat digunakan oleh pengguna dengan disabilitas, tutorial juga harus accessible.

Pastikan:

### Screen reader

Screen reader harus dapat membaca:

* judul tutorial
* deskripsi
* step saat ini
* jumlah step
* tombol kembali
* tombol lanjut
* tombol selesai
* tombol lewati

Contoh:

> "Tutorial Buat Laporan. Langkah 2 dari 4."

Jangan hanya mengandalkan visual highlight.

---

# 13. KEYBOARD

Tutorial harus dapat digunakan dengan keyboard.

Pastikan:

* focus berpindah secara logis
* tombol dapat diakses dengan Tab
* Enter/Space dapat menjalankan action
* Escape dapat menutup tutorial jika sesuai
* tidak terjadi keyboard trap

Focus indicator harus terlihat jelas.

---

# 14. TUNANETRA / SCREEN READER

Jangan membuat tutorial bergantung pada highlight visual saja.

Jika elemen sedang di-highlight, screen reader harus mendapatkan konteks yang sama.

Contoh:

Visual:

**[ BUAT LAPORAN ]**

Screen reader:

> "Buat Laporan. Tombol untuk membuat laporan baru."

Jika step berpindah:

> "Langkah 2 dari 4. Pilih Kategori. Pilih kategori laporan."

Gunakan semantic HTML dan ARIA hanya jika diperlukan.

---

# 15. MOBILE

Tutorial harus dirancang mobile-first.

Pastikan:

* spotlight tidak terpotong
* tooltip tidak keluar layar
* tombol mudah disentuh
* teks tidak terlalu kecil
* overlay tidak menghalangi informasi penting
* tutorial tidak menyebabkan horizontal scrolling

Jika tooltip tidak memiliki ruang:

**ubah menjadi bottom sheet.**

Contoh:

```text
┌─────────────────────────┐
│                         │
│       APP SCREEN        │
│                         │
│                         │
├─────────────────────────┤
│ ● ○ ○ ○                 │
│                         │
│ Buat Laporan            │
│                         │
│ Gunakan tombol ini      │
│ untuk membuat laporan.  │
│                         │
│ Lewati       Lanjut →   │
└─────────────────────────┘
```

---

# 16. JANGAN MENGGANGGU PENGGUNA

Tutorial harus membantu, bukan mengganggu.

Jangan:

* menampilkan tutorial terlalu sering
* menampilkan tutorial pada setiap halaman setiap kali dibuka
* membuat tutorial terlalu panjang
* memblokir seluruh aplikasi terlalu lama
* memaksa pengguna menyelesaikan tutorial
* membuat pengguna bingung bagaimana keluar

Idealnya satu fitur memiliki **3–5 langkah saja**.

---

# 17. VISUAL STYLE

Sesuaikan tutorial dengan design system aplikasi.

Jangan membuat tutorial terlihat seperti komponen dari aplikasi lain.

Gunakan:

* typography yang sama
* warna yang sama
* border radius yang konsisten
* icon style yang sama
* spacing yang sama

Tutorial harus terasa sebagai bagian dari produk.

Hindari:

* gradient berlebihan
* glassmorphism
* neon
* glow
* karakter maskot yang tidak diperlukan
* confetti berlebihan
* desain yang terlihat seperti template AI

Nuansanya:

**modern + friendly + simple + playful + professional**

seperti onboarding aplikasi modern, tetapi tetap accessible.

---

# 18. MICRO-INTERACTION

Boleh tambahkan micro-interaction kecil agar terasa seperti game.

Contoh:

Ketika step selesai:

✓

Kemudian spotlight berpindah ke elemen berikutnya.

Pada tutorial selesai:

> **Selesai! 🎉**
>
> Sekarang kamu sudah tahu cara menggunakan fitur ini.

Tetapi gunakan secara minimal.

---

# 19. TEKNIS

Sebelum implementasi:

1. Periksa framework yang digunakan.
2. Periksa library UI yang sudah ada.
3. Periksa apakah project sudah memiliki library guided-tour/onboarding.
4. Jika sudah ada library yang sesuai, pertimbangkan menggunakan library tersebut daripada membuat sistem dari nol.
5. Jika membuat sendiri, buat reusable component.

Jangan menambahkan dependency baru jika tidak diperlukan.

Pastikan implementasi tidak merusak:

* routing
* state management
* API
* authentication
* existing functionality
* responsive layout

---

# 20. HASIL YANG SAYA INGINKAN

Saya ingin pengalaman seperti:

**"Pertama kali masuk fitur → aplikasi menunjukkan apa yang harus diperhatikan → elemen tersebut di-highlight → pengguna memahami manfaatnya → klik lanjut → aplikasi menunjukkan elemen berikutnya."**

Bukan:

**"Pop-up besar berisi tutorial panjang."**

Bayangkan UX seperti tutorial game yang sederhana:

> **Ini apa?**
>
> **Gunanya apa?**
>
> **Klik di mana?**
>
> **Lanjut ke langkah berikutnya.**

Tutorial harus terasa **natural, cepat, interaktif, dan tidak menggurui**.

---

## PRIORITAS IMPLEMENTASI

Urutkan prioritas sebagai berikut:

**1. Accessibility**
↓
**2. Usability**
↓
**3. Clarity**
↓
**4. Smooth interaction**
↓
**5. Visual polish**

Jangan mengorbankan accessibility hanya demi efek visual.

Setelah implementasi selesai, test seluruh tutorial pada:

* desktop
* mobile
* keyboard navigation
* screen reader
* reduced motion
* viewport kecil

Pastikan tidak ada tooltip yang terpotong, focus yang hilang, atau elemen yang tidak dapat diakses.
