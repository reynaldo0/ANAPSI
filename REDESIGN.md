## PROMPT REDESAIN UI/UX

Tolong lakukan **redesign menyeluruh pada tampilan antarmuka aplikasi ini** agar terlihat lebih modern, natural, profesional, dan terasa seperti produk digital yang benar-benar dirancang oleh UI/UX designer — **BUKAN seperti hasil AI-generated design / AI slop**.

### 1. TUJUAN UTAMA

Redesign harus memenuhi 3 tujuan:

1. **Modern & clean**

   * Tampilan sederhana, elegan, dan tidak berlebihan.
   * Gunakan visual hierarchy yang jelas.
   * Prioritaskan whitespace yang cukup.
   * Gunakan komponen UI secukupnya.
   * Setiap halaman harus memiliki fokus utama yang jelas.

2. **Tidak terlihat seperti AI Slop**
   HINDARI:

   * Terlalu banyak gradient.
   * Glassmorphism berlebihan.
   * Glow/neon effect.
   * Blob shapes yang tidak memiliki fungsi.
   * Terlalu banyak rounded card.
   * Dashboard penuh kartu statistik yang tidak diperlukan.
   * Ikon dekoratif yang berlebihan.
   * Typography yang terlalu banyak variasi.
   * Copywriting generik seperti “Empowering Your Journey”, “Unlock Your Potential”, dan sejenisnya.
   * Layout yang terlihat seperti template AI/SaaS generik.
   * Penggunaan warna yang terlalu ramai.
   * Elemen dekoratif yang mengganggu aksesibilitas.

Gunakan prinsip:
**simple, purposeful, readable, human, functional.**

Setiap elemen visual harus mempunyai alasan UX yang jelas.

---

# 2. ANALISIS TERLEBIH DAHULU

Sebelum melakukan perubahan kode:

1. Baca seluruh struktur project.
2. Identifikasi:

   * framework yang digunakan
   * design system
   * komponen reusable
   * typography
   * color system
   * navigation
   * layout
   * responsive behavior
   * state/error/loading
3. Baca seluruh halaman dan komponen UI yang relevan.
4. Jangan langsung mengganti semuanya secara acak.

Pertahankan:

* business logic
* API
* database
* authentication
* routing
* fungsi utama aplikasi

Fokus utama perubahan adalah **UI/UX dan accessibility**, kecuali ada masalah teknis yang memang menghambat aksesibilitas.

---

# 3. DESIGN SYSTEM BARU

Buat design system yang konsisten.

### Typography

Gunakan maksimal 1–2 keluarga font.

Prioritaskan:

* readability
* ukuran teks yang nyaman
* line-height yang cukup
* hierarchy yang jelas

Hindari typography yang terlalu kecil.

Body text harus nyaman dibaca pada desktop maupun mobile.

### Warna

Gunakan palet warna yang sederhana.

Pastikan:

* contrast ratio memenuhi standar aksesibilitas
* teks tidak hanya dibedakan menggunakan warna
* status memiliki indikator tambahan seperti icon/text
* jangan menggunakan warna pucat untuk teks utama

Gunakan semantic colors:

* primary
* secondary
* success
* warning
* error
* info
* background
* surface
* text
* muted text
* border

Pastikan setiap warna mempunyai fungsi.

---

# 4. RESPONSIVE DESIGN

UI harus benar-benar responsive.

Prioritaskan:

### Mobile

* layout sederhana
* tombol mudah ditekan
* navigasi mudah dipahami
* tidak ada horizontal scrolling
* konten tidak terlalu padat
* form mudah digunakan
* modal tidak menyulitkan pengguna

### Tablet

Sesuaikan spacing dan layout agar tidak sekadar memperbesar mobile.

### Desktop

Manfaatkan ruang secara proporsional tanpa membuat UI terlalu melebar.

Jangan membuat desktop UI yang terasa seperti dashboard enterprise jika produk tidak membutuhkan itu.

---

# 5. AKSESIBILITAS TUNANETRA

Accessibility harus menjadi **bagian inti desain**, bukan fitur tambahan.

Pastikan seluruh aplikasi dapat digunakan menggunakan **screen reader**, termasuk TalkBack pada Android dan screen reader pada platform desktop.

### Semantic HTML

Gunakan elemen semantic:

* `<header>`
* `<nav>`
* `<main>`
* `<section>`
* `<article>`
* `<footer>`
* `<button>`
* `<label>`
* `<input>`
* `<textarea>`

JANGAN menggunakan `<div>` sebagai button jika `<button>` dapat digunakan.

---

# 6. SCREEN READER

Semua elemen interaktif harus mempunyai accessible name yang jelas.

Contoh:

SALAH:
`aria-label="icon"`

BENAR:
`aria-label="Buka menu"`

SALAH:
button hanya berisi icon tanpa label.

BENAR:
icon button memiliki accessible label yang menjelaskan aksinya.

Pastikan screen reader dapat memahami:

* nama halaman
* heading
* tombol
* input
* navigasi
* status
* error
* loading
* perubahan konten
* modal
* dialog
* notifikasi

Gunakan ARIA hanya jika memang diperlukan. **Jangan menggunakan ARIA untuk menggantikan semantic HTML.**

---

# 7. KEYBOARD ACCESSIBILITY

Semua fungsi penting harus dapat digunakan tanpa mouse.

Pastikan:

* Tab navigation berjalan secara logis.
* Focus indicator terlihat jelas.
* Tidak ada keyboard trap.
* Modal dapat dibuka dan ditutup menggunakan keyboard.
* Dropdown dapat digunakan dengan keyboard.
* Semua button dapat difokuskan.
* Urutan focus mengikuti urutan visual/logis halaman.

Jangan menghilangkan:

`outline: none`

tanpa menyediakan focus indicator pengganti yang jelas.

---

# 8. KONTRAS & VISUAL ACCESSIBILITY

Pastikan UI tetap dapat digunakan oleh pengguna dengan:

* low vision
* color blindness
* sensitivitas visual
* kesulitan membaca teks kecil

Jangan menyampaikan informasi hanya menggunakan warna.

Contoh:

SALAH:

🔴 = error
🟢 = berhasil

BENAR:

🔴 Error — Data gagal disimpan

🟢 Berhasil — Data berhasil disimpan

Gunakan icon + text + warna jika diperlukan.

---

# 9. TARGET SENTUH

Untuk mobile:

* tombol harus cukup besar untuk disentuh
* jangan membuat icon button terlalu kecil
* beri spacing antar tombol
* jangan menempatkan action penting terlalu berdekatan

Prioritaskan kemudahan pengguna dengan keterbatasan motorik.

---

# 10. FORM ACCESSIBILITY

Setiap input harus mempunyai label yang jelas.

Jangan hanya mengandalkan placeholder.

Contoh:

SALAH:

`placeholder="Masukkan nama"`

BENAR:

Label:
`Nama lengkap`

Placeholder:
`Contoh: Budi Santoso`

Error harus menjelaskan:

* field mana yang bermasalah
* apa masalahnya
* bagaimana memperbaikinya

Contoh:

BUKAN:
`Invalid input`

TAPI:
`Email belum valid. Masukkan alamat email seperti nama@email.com.`

---

# 11. MOTION & ANIMATION

Gunakan animasi secara minimal dan fungsional.

HINDARI:

* animasi terus-menerus
* floating animation yang tidak diperlukan
* excessive transitions
* parallax
* flashing elements

Implementasikan dukungan:

`prefers-reduced-motion`

Jika pengguna memilih reduced motion, kurangi atau hilangkan animasi yang tidak penting.

---

# 12. NAVIGASI

Navigasi harus mudah dipahami bahkan tanpa melihat visual.

Pastikan:

* current page memiliki state yang jelas
* breadcrumb digunakan jika memang diperlukan
* heading mengikuti hierarchy yang benar
* tidak ada halaman yang terasa “tersesat”
* back navigation konsisten

Jangan mengandalkan icon saja untuk navigasi penting.

---

# 13. EMPTY / LOADING / ERROR STATE

Jangan hanya mendesain kondisi normal.

Setiap fitur penting harus memiliki:

* loading state
* empty state
* error state
* success state
* disabled state

Pastikan setiap state juga dapat dipahami screen reader.

Contoh loading:

`Memuat data laporan...`

bukan hanya spinner tanpa informasi.

---

# 14. HIERARCHY HALAMAN

Setiap halaman harus memiliki struktur visual seperti:

**Page title**

Deskripsi singkat jika diperlukan.

**Primary action**

Konten utama

Secondary actions

Jangan membuat semua elemen terlihat sama pentingnya.

Pengguna harus dapat memahami:

> "Saya berada di mana?"
>
> "Apa yang bisa saya lakukan?"
>
> "Apa tindakan utama di halaman ini?"

dalam beberapa detik.

---

# 15. KOMPONEN

Buat atau rapikan reusable components untuk:

* Button
* Input
* Select
* Checkbox
* Radio
* Card
* Modal/Dialog
* Toast
* Alert
* Navigation
* Tabs
* Tooltip
* Loading
* Empty State
* Error State

Pastikan seluruh komponen memiliki state:

* default
* hover
* focus
* active
* disabled
* loading
* error

Jangan membuat style berbeda-beda untuk komponen yang sebenarnya sama.

---

# 16. JANGAN OVERDESIGN

Prinsip utama:

> **Accessibility > usability > clarity > aesthetics > decoration**

Jika suatu elemen terlihat bagus tetapi mengurangi readability atau accessibility, **hapus atau sederhanakan elemen tersebut.**

Jangan menambahkan komponen hanya agar halaman terlihat lebih "premium".

---

# 17. VALIDASI

Setelah redesign selesai, lakukan audit terhadap seluruh halaman.

Periksa:

### Visual

* spacing
* typography
* alignment
* hierarchy
* consistency
* responsive layout

### Accessibility

* semantic HTML
* heading hierarchy
* keyboard navigation
* focus state
* screen reader labels
* form labels
* error messages
* color contrast
* touch target
* reduced motion

### UX

* apakah CTA utama jelas?
* apakah user tahu harus melakukan apa?
* apakah navigation mudah dipahami?
* apakah informasi terlalu padat?
* apakah ada elemen yang sebenarnya tidak diperlukan?

---

# 18. HASIL AKHIR YANG DIHARAPKAN

Saya tidak ingin sekadar:

"mengubah warna dan border radius."

Saya ingin **redesign UI/UX yang benar-benar terasa berbeda dan lebih matang**, tetapi tetap mempertahankan identitas dan fungsi produk.

Hasil akhirnya harus terasa seperti:

**produk digital modern yang dibuat oleh product designer profesional, sederhana, manusiawi, accessible, dan siap digunakan oleh pengguna dengan maupun tanpa disabilitas.**

Bukan:

**template SaaS + gradient + banyak card + icon + AI slop.**

Prioritaskan **clarity, simplicity, accessibility, consistency, dan usability.**

Jika menemukan keputusan desain yang meragukan, pilih solusi yang paling sederhana dan paling mudah diakses pengguna.
