# BLINDSPOT — DESIGN.md

> **Project:** BLINDSPOT  
> **Design Direction:** Modern, Friendly, Accessible, Human-Centered  
> **Primary Users:** Tunanetra dan tunadaksa/pengguna kursi roda  
> **Platform:** Responsive Web Application  
> **Design Goal:** Beautiful enough for a modern competition product, simple enough to be genuinely usable.

---

# 1. DESIGN VISION

## 1.1 Design Statement

BLINDSPOT harus terasa seperti produk digital modern yang:

- Bersih.
- Hangat.
- Friendly.
- Tidak intimidating.
- Mudah dipahami.
- Sangat accessible.
- Terlihat premium tanpa terasa berlebihan.

BLINDSPOT BUKAN aplikasi enterprise, dashboard pemerintahan, atau GIS system yang penuh tabel dan kontrol.

BLINDSPOT harus terasa seperti:

> **A friendly digital companion that helps people move through the world with more confidence.**

---

# 2. DESIGN PERSONALITY

Gunakan lima karakter utama berikut:

## Calm

Interface tidak membuat pengguna stres.

## Friendly

Bahasa dan visual terasa manusiawi.

## Clear

Informasi penting langsung terlihat.

## Confident

Sistem memberikan informasi dengan jelas tanpa terlalu banyak jargon.

## Inclusive

Desain tidak memperlakukan aksesibilitas sebagai fitur tambahan.

---

# 3. DESIGN PRINCIPLES

## PRINCIPLE 01 — ACCESSIBILITY IS THE DESIGN

Aksesibilitas bukan menu tambahan.

Aksesibilitas harus menjadi bagian dari:

- Layout.
- Typography.
- Navigation.
- Colors.
- Interactions.
- Forms.
- Map.
- Feedback.

---

## PRINCIPLE 02 — SIMPLE BEFORE SMART

Jika sebuah masalah bisa diselesaikan dengan interface sederhana, jangan menambahkan AI, dashboard, filter, atau modal yang tidak diperlukan.

---

## PRINCIPLE 03 — ONE CLEAR PRIMARY ACTION

Setiap halaman harus memiliki satu tindakan utama.

Contoh:

Map:

> **Cari Tujuan**

Report:

> **Laporkan Hambatan**

Journey:

> **Mulai Navigasi**

---

## PRINCIPLE 04 — NEVER OVERLOAD THE USER

Hindari:

- Terlalu banyak card.
- Terlalu banyak statistik.
- Terlalu banyak warna.
- Terlalu banyak icon.
- Terlalu banyak tombol.

Prioritaskan informasi berdasarkan konteks.

---

## PRINCIPLE 05 — HUMAN LANGUAGE

Gunakan bahasa yang sederhana.

Jangan:

> "Accessibility infrastructure anomaly detected."

Gunakan:

> "Ada hambatan yang dilaporkan di jalur ini."

---

# 4. VISUAL STYLE

## 4.1 Overall Direction

Design style:

- Modern web app.
- Soft minimalism.
- Rounded corners secukupnya.
- Clean spacing.
- Large readable typography.
- Friendly illustrations/icons.
- Subtle motion.
- Minimal visual noise.

Inspirasi rasa visual:

> Modern mobility app + premium accessibility product + friendly consumer technology.

JANGAN meniru tampilan secara langsung dari produk lain.

---

# 5. COLOR SYSTEM

## 5.1 Core Brand Direction

Gunakan warna utama yang terasa:

- Aman.
- Tenang.
- Modern.
- Inklusif.

Recommended primary direction:

### Primary

Deep Indigo / Accessible Blue

Digunakan untuk:

- Primary CTA.
- Active state.
- Important navigation.
- Focus-related UI.

### Accent

Soft Teal / Mint

Digunakan secara terbatas untuk:

- Positive accessibility.
- Helpful highlights.
- Supporting visuals.

### Neutral

Gunakan neutral slate/gray yang modern.

---

## 5.2 Semantic Colors

Warna status harus memiliki arti konsisten.

### Success / Accessible

Label:

> Accessible

Harus selalu disertai:

- Icon.
- Text.

Jangan hanya menggunakan warna hijau.

---

### Warning / Limited

Label:

> Limited Access

Harus disertai:

- Icon.
- Text.

---

### Danger / Barrier

Label:

> Barrier Reported

Harus disertai:

- Icon.
- Text.

---

### Unknown

Label:

> Data Not Available

Gunakan neutral treatment.

---

## 5.3 Critical Accessibility Rule

Tidak boleh ada informasi penting yang hanya dibedakan menggunakan warna.

Contoh SALAH:

```text
Green = Accessible
Red = Not Accessible
```

Tanpa text.

Contoh BENAR:

```text
✓ Accessible

⚠ Limited Access

! Barrier Reported
```

---

# 6. TYPOGRAPHY

## 6.1 Typography Direction

Gunakan sans-serif modern yang:

- Sangat mudah dibaca.
- Memiliki karakter jelas.
- Mendukung ukuran besar.
- Bagus untuk screen rendering.

Recommended options:

- Inter.
- Geist.
- Atkinson Hyperlegible jika tersedia dan sesuai branding.

Agent harus memilih satu font utama dan menggunakannya secara konsisten.

---

## 6.2 Typography Scale

Suggested hierarchy:

```text
Display
48–64px

H1
36–48px

H2
28–36px

H3
22–28px

Body Large
18–20px

Body
16–18px

Small
14px minimum
```

Jangan menggunakan ukuran body utama terlalu kecil.

Default body minimum:

> **16px**

---

## 6.3 Readability

Requirements:

- Line-height nyaman.
- Paragraph tidak terlalu panjang.
- Max text width dikontrol.
- Heading hierarchy konsisten.

---

# 7. SPACING SYSTEM

Gunakan spacing scale yang konsisten.

Recommended:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Jangan menggunakan spacing random.

---

# 8. BORDER RADIUS

Gunakan rounded corners modern tetapi jangan berlebihan.

Suggested:

```text
Small: 8px
Medium: 12px
Large: 16px
XL: 24px
```

Cards:

> 16–24px

Buttons:

> 10–14px

---

# 9. SHADOWS

Shadows harus subtle.

Gunakan untuk:

- Floating cards.
- Bottom sheet.
- Modal.
- Important floating actions.

Jangan membuat semua card memiliki shadow besar.

Flat hierarchy lebih baik daripada shadow berlebihan.

---

# 10. ICONOGRAPHY

Gunakan icon library yang konsisten.

Recommended:

- Lucide Icons.

Rules:

- Jangan mencampur banyak style icon.
- Icon harus memiliki label jika maknanya tidak universal.
- Icon-only button wajib memiliki accessible label.

---

# 11. RESPONSIVE DESIGN

BLINDSPOT harus:

- Mobile-first.
- Desktop-friendly.
- Tablet-friendly.

---

# 12. MOBILE EXPERIENCE

## 12.1 Priority

Mobile adalah pengalaman penting karena:

- Navigation dilakukan di luar.
- Report dilakukan saat menemukan hambatan.
- Current location digunakan saat bergerak.

---

## 12.2 Mobile Layout

Gunakan:

- Bottom sheet.
- Large touch targets.
- Sticky primary action.
- Bottom navigation bila diperlukan.

Minimum touch target:

> **44 × 44 px**

Ideal:

> **48 × 48 px**

---

# 13. DESKTOP EXPERIENCE

Desktop digunakan untuk:

- Exploring map.
- Viewing detailed information.
- Community data.
- Admin.

Desktop layout harus lebih luas tetapi tetap minimal.

Jangan mengisi seluruh layar dengan panel.

---

# 14. NAVIGATION ARCHITECTURE

## Primary Navigation

Recommended:

```text
Home
Map
Report
Community
Profile
```

## Mobile

Gunakan bottom navigation untuk area inti.

Suggested:

```text
Home | Map | Report | Community | Profile
```

Report dapat dibuat lebih menonjol sebagai central action jika UX tetap jelas.

---

# 15. GLOBAL HEADER

Header harus:

- Clean.
- Tidak terlalu tinggi.
- Memiliki logo.
- Primary navigation desktop.
- Profile/settings access.

Jangan membuat header penuh menu.

---

# 16. ACCESSIBILITY PROFILE SWITCHER

Ini adalah elemen UI yang sangat penting.

Harus selalu jelas profile mana yang aktif.

Example:

```text
Current Mode

👁 Visual Navigation
[Change]
```

atau:

```text
♿ Wheelchair Mobility ▼
```

Ketika profile berubah:

- Map layer berubah.
- Accessibility score berubah.
- Recommendation berubah.
- Relevant warnings berubah.

Transition harus smooth tetapi tidak menghalangi pengguna.

---

# 17. LANDING PAGE DESIGN

## Goal

Landing page harus langsung menjawab:

1. Apa itu BLINDSPOT?
2. Untuk siapa?
3. Apa manfaatnya?
4. Apa yang bisa dilakukan sekarang?

---

## 17.1 Hero Section

Hero harus sederhana.

### Headline

Contoh direction:

> **Navigate with confidence.**

Supporting text:

> Discover accessibility information, understand barriers, and find routes that fit your journey.

Primary CTA:

> Explore Accessibility Map

Secondary CTA:

> How It Works

---

## 17.2 Hero Visual

Gunakan visual konseptual yang modern.

Jangan membuat dashboard palsu yang penuh angka.

Visual dapat menggambarkan:

- Map.
- Route.
- Accessibility markers.
- Person journey.

---

## 17.3 Feature Preview

Tampilkan hanya 3–4 value utama:

### 🗺 Accessibility Map

Know what exists around you.

### 🧭 Personalized Routes

Routes based on your needs.

### 📢 Community Reports

Share real-world conditions.

### 🤝 Better Data Together

Keep accessibility information updated.

---

# 18. ONBOARDING DESIGN

Onboarding harus singkat.

Maximum:

> 2–3 steps.

---

## Screen 1

### Title

> How do you navigate?

Dua pilihan besar:

```text
┌───────────────────────────┐
│ 👁                        │
│ Visual Navigation         │
│ Information for your      │
│ journey through audio and │
│ accessible route details. │
└───────────────────────────┘

┌───────────────────────────┐
│ ♿                        │
│ Wheelchair Mobility       │
│ Find routes and places    │
│ based on mobility needs.  │
└───────────────────────────┘
```

Cards harus dapat dipilih menggunakan:

- Mouse.
- Touch.
- Keyboard.

---

## Screen 2

### Title

> We'll personalize your experience.

Jelaskan secara singkat:

- Map.
- Warnings.
- Scores.
- Recommendations.

---

# 19. HOME / DASHBOARD DESIGN

Jangan membuat dashboard penuh statistik.

Home harus action-oriented.

---

## Top Section

Greeting sederhana:

> Good morning, Reynaldo.

atau generic:

> Where do you want to go today?

---

## Primary Search

Large search input:

```text
🔍 Search a destination
```

---

## Quick Actions

Maximum 3:

```text
🗺 Explore Map

📍 Use Current Location

📢 Report a Barrier
```

---

## Nearby Information

Tampilkan:

> Nearby accessibility updates

Dalam list horizontal/vertical sederhana.

---

# 20. MAP PAGE DESIGN

Map adalah fitur utama.

Tetapi map tidak boleh menjadi interface yang membingungkan.

---

## 20.1 Layout

### Desktop

```text
┌───────────────────────────────────────────────┐
│ Header                                        │
├───────────────┬───────────────────────────────┤
│ Search/List   │                               │
│               │             MAP               │
│ Location Card │                               │
│               │                               │
│ Reports       │                               │
└───────────────┴───────────────────────────────┘
```

### Mobile

```text
┌───────────────────────┐
│ Search                │
├───────────────────────┤
│                       │
│         MAP           │
│                       │
│                       │
├───────────────────────┤
│ Bottom Sheet          │
│ Accessibility Info    │
└───────────────────────┘
```

---

## 20.2 Map Controls

Controls harus minimal.

Required:

- Current location.
- Profile switcher.
- Layer/filter.
- Accessible list view.

Jangan menampilkan 10 tombol floating sekaligus.

---

## 20.3 Map Marker Design

Marker harus:

- Mudah dibedakan.
- Tidak hanya dibedakan warna.
- Memiliki bentuk/icon yang berbeda.

Example:

```text
⚠ Barrier

♿ Mobility Feature

👁 Visual Navigation Feature

✓ Verified Accessible
```

---

# 21. ACCESSIBLE LIST VIEW

Sangat penting untuk tunanetra.

Map harus memiliki tombol:

> **View as List**

List menampilkan:

- Nama.
- Jarak.
- Jenis informasi.
- Status.
- Verification.

Contoh:

```text
⚠ Damaged Guiding Block
120 m away
Verified yesterday

♿ Ramp Available
250 m away
Verified 3 days ago
```

---

# 22. PLACE DETAIL PAGE

Place detail harus menjadi halaman informasi yang sangat jelas.

---

## Header

```text
← Back

UNIVERSITAS NEGERI JAKARTA

📍 Jakarta Timur
```

---

## Accessibility Summary

Tampilkan berdasarkan active profile.

Example:

```text
Wheelchair Accessibility

82 / 100
Highly Accessible
```

Jangan membuat angka menjadi satu-satunya informasi.

Tambahkan:

> Based on available community data.

---

## Key Information

Gunakan summary cards:

```text
✓ Ramp Available

⚠ Main entrance has stairs

✓ Accessible parking reported
```

---

## Main CTA

```text
[ Find Accessible Route ]
```

---

# 23. ACCESSIBILITY SCORE DESIGN

Score harus mudah dipahami.

Recommended component:

```text
Accessibility Score

82
Highly Accessible

Based on verified and
community-reported information.
```

Tambahkan:

> View details

---

## Detail

```text
What affects this score?

✓ Accessible entrance
✓ Ramp available
⚠ Uneven surface reported
```

Jangan menggunakan formula matematika yang membingungkan pengguna.

---

# 24. ROUTE PLANNER DESIGN

## Route Search

Large, clean inputs:

```text
From
📍 Current Location

To
🔍 Search destination
```

Profile visible:

```text
For:
♿ Wheelchair Mobility
```

---

## Route Result

Gunakan route cards.

### Recommended

```text
⭐ Recommended

Most Accessible Route

15 min · 1.2 km

Accessibility Score
90 / 100

✓ Avoids reported stairs
✓ Accessible entrance available

[ View Route ]
```

---

### Alternative

```text
Fastest Route

12 min · 1.0 km

Accessibility Score
68 / 100

⚠ One reported barrier
```

---

# 25. JOURNEY BRIEF DESIGN

Sebelum memulai perjalanan.

Full screen / focused screen.

```text
Your Journey

To:
Universitas Negeri Jakarta

Accessibility Score
88 / 100

Things to know:

⚠ Damaged sidewalk reported
✓ Ramp near destination
⚠ Main entrance has stairs

[ Start Navigation ]
```

---

# 26. VISUAL NAVIGATION MODE DESIGN

Mode ini harus meminimalkan kebutuhan melihat layar.

---

## Screen Structure

```text
CURRENT INSTRUCTION

Walk forward for 50 meters

[ 🔊 Repeat ]

NEXT

Pedestrian crossing ahead
```

---

## Requirements

- Text besar.
- High contrast.
- Sedikit informasi per layar.
- Audio controls jelas.
- Tidak ada animasi yang mengganggu.

---

# 27. WHEELCHAIR JOURNEY MODE

Prioritaskan informasi hambatan.

```text
NEXT SECTION

✓ Accessible sidewalk

In 120 m:

⚠ Narrow path reported

Alternative available
```

CTA:

> View Alternative

---

# 28. REPORT FLOW DESIGN

Reporting harus sangat mudah.

Jangan langsung menampilkan form panjang.

---

# Screen 1 — How would you like to report?

```text
🎙 Speak

📷 Take / Upload Photo

⌨ Write Report
```

---

# Screen 2 — Report Information

AI/manual data:

```text
What happened?

Damaged Ramp

Where?

Current Location

Who may be affected?

♿ Wheelchair Mobility
```

---

# Screen 3 — Confirm

```text
Review your report

Category
Damaged Ramp

Location
Current Location

Description
Ramp surface is damaged.

[ Submit Report ]
```

---

# 29. VOICE REPORT UI

Recording UI harus sangat sederhana.

```text
Tell us what happened

        🎙

     Listening...

Tap to stop
```

Setelah selesai:

```text
We understood:

"Ramp near the entrance is damaged."

Category:
Damaged Ramp

[ Edit ]  [ Confirm ]
```

---

# 30. AI ANALYSIS DESIGN

AI harus terasa membantu, bukan magical.

Gunakan label:

> AI suggestion

Bukan:

> AI has confirmed.

Example:

```text
✨ AI suggestion

We identified:

⚠ Stairs
♿ Potential mobility barrier

Please review before submitting.

[ Edit ] [ Confirm ]
```

---

# 31. COMMUNITY PAGE

Jangan membuat seperti social media.

Community page fokus pada:

> Real-world accessibility updates.

---

## Tabs

```text
Nearby
Recent
Verified
```

---

## Report Card

```text
⚠ Damaged Sidewalk

Affects:
♿ Wheelchair Mobility

📍 350 m away

✓ Verified

Updated 2 days ago

[ View Details ]
```

---

# 32. REPORT DETAIL PAGE

Layout:

```text
Damaged Guiding Block

📍 Location

STATUS
✓ Verified

DESCRIPTION
Guiding block is blocked by construction.

LAST VERIFIED
2 days ago

[ Still Accurate ]
[ Condition Changed ]
```

---

# 33. COMMUNITY VERIFICATION UX

Verification harus mudah.

Jangan gunakan sistem voting yang rumit.

Primary actions:

```text
✓ Still Accurate

↻ Condition Changed

✓ Issue Resolved
```

Setelah klik:

> Thanks for helping keep this information updated.

---

# 34. PROFILE PAGE

Minimal.

Sections:

```text
My Accessibility Profile

Appearance

Saved Places

My Reports

Account
```

---

# 35. SETTINGS DESIGN

Accessibility settings:

```text
Appearance

○ System
○ Light
○ Dark

Accessibility

[ ] High Contrast
[ ] Reduce Motion

Text Size
A-  ─────●────  A+
```

Catatan:

Website harus tetap usable meskipun semua custom settings tidak diaktifkan.

---

# 36. HIGH CONTRAST MODE

High contrast mode harus:

- Memperjelas boundaries.
- Meningkatkan contrast.
- Tidak hanya mengubah warna menjadi hitam putih.
- Mempertahankan hierarchy.

---

# 37. REDUCE MOTION

Hormati:

```text
prefers-reduced-motion
```

Animasi harus dapat dikurangi atau dihilangkan.

---

# 38. INTERACTION DESIGN

## Button States

Semua interactive element harus memiliki:

- Default.
- Hover.
- Focus.
- Active.
- Disabled.
- Loading jika asynchronous.

---

# 39. FOCUS STATES

Focus state WAJIB terlihat jelas.

Jangan menghapus browser focus outline tanpa menggantinya.

Focus harus:

- Kontras.
- Konsisten.
- Tidak tertutup elemen lain.

---

# 40. MODALS

Gunakan modal hanya jika diperlukan.

Modal harus:

- Trap focus.
- Close with Escape.
- Return focus to trigger.
- Have accessible title.

---

# 41. TOAST NOTIFICATIONS

Gunakan untuk feedback singkat.

Examples:

```text
✓ Report submitted successfully.

✓ Accessibility profile updated.

⚠ Unable to load current location.
```

Toast tidak boleh menjadi satu-satunya cara menyampaikan error penting.

---

# 42. LOADING UX

Gunakan loading state yang informatif.

Jangan hanya spinner tanpa konteks.

Examples:

```text
Finding accessible routes...

Loading nearby accessibility information...

Analyzing your report...
```

---

# 43. EMPTY STATES

Empty state harus membantu.

Example:

```text
No accessibility reports yet

This area needs more accessibility information.

[ Add Information ]
```

---

# 44. ERROR STATES

Error harus:

- Jelas.
- Tidak menyalahkan pengguna.
- Memberikan solusi.

Example:

> We couldn't analyze your voice report.

Actions:

```text
[ Try Again ]

[ Write Report Instead ]
```

---

# 45. FORM UX

Forms harus:

- Label selalu terlihat.
- Error message jelas.
- Required fields jelas.
- Tidak mengandalkan placeholder sebagai label.

---

# 46. BUTTON LANGUAGE

Gunakan action-oriented labels.

Jangan:

> Submit

Jika konteks bisa lebih jelas.

Gunakan:

> Submit Report

Jangan:

> Continue

Jika lebih spesifik:

> View Accessible Route

---

# 47. CONTENT TONE

Tone:

- Friendly.
- Respectful.
- Calm.
- Helpful.

Avoid:

- Pitying language.
- Infantilizing language.
- Overly technical language.

---

# 48. MICROCOPY EXAMPLES

## No Data

> We don't have enough accessibility information here yet.

## Unknown

> Accessibility information is currently unavailable.

## Verified

> This information was recently verified by the community.

## Report

> Help others by sharing what you found.

---

# 49. ACCESSIBILITY REQUIREMENTS FOR DESIGN

## WCAG-Oriented Requirements

Design should target:

- Sufficient color contrast.
- Keyboard operation.
- Visible focus.
- Text alternatives.
- Semantic structure.
- Responsive text.
- No color-only meaning.

---

# 50. SCREEN READER UX

Important components must have meaningful labels.

Example:

BAD:

```text
Button
```

GOOD:

```text
Repeat navigation instruction
```

---

# 51. MAP ACCESSIBILITY UX

Because maps are inherently visual:

Every map feature MUST have:

- Accessible name.
- Description.
- Alternative list representation.

Map must never be the only path to critical information.

---

# 52. KEYBOARD UX

Logical order:

```text
Skip Link
↓
Header
↓
Main Search
↓
Primary Content
↓
Secondary Actions
↓
Footer
```

Avoid keyboard traps.

---

# 53. MOBILE TOUCH UX

Minimum:

> 44 × 44 px

Important actions should have enough spacing.

Avoid:

- Tiny map controls.
- Small close buttons.
- Closely packed icon buttons.

---

# 54. ANIMATION SYSTEM

Animations should be:

- Short.
- Purposeful.
- Subtle.

Recommended:

- Fade.
- Small slide.
- Small scale.

Avoid:

- Excessive bouncing.
- Continuous motion.
- Long page transitions.

---

# 55. DESIGN TOKENS

The agent SHOULD centralize:

```text
colors
spacing
typography
radius
shadows
breakpoints
z-index
motion
```

Do not hardcode random values throughout the application.

---

# 56. COMPONENT DESIGN REQUIREMENTS

## Primary Button

- Clear.
- High contrast.
- Minimum touch target.
- Loading state.

## Secondary Button

- Lower visual emphasis.

## Danger Button

Used only for destructive actions.

---

# 57. CARD SYSTEM

Cards should not be used for everything.

Use cards when:

- Grouping meaningful information.
- Showing locations.
- Showing reports.
- Showing routes.

Avoid:

- Card inside card inside card.

---

# 58. INFORMATION HIERARCHY

Every screen should answer:

### What is this?

### What matters most?

### What can I do next?

If a screen cannot answer these within a few seconds, simplify it.

---

# 59. RECOMMENDED DESIGN FLOW FOR JUDGES

Competition demo should feel smooth.

```text
LANDING
   ↓
SELECT PROFILE
   ↓
SEARCH DESTINATION
   ↓
SEE PERSONALIZED ACCESSIBILITY
   ↓
COMPARE ROUTES
   ↓
VIEW JOURNEY BRIEF
   ↓
REPORT BARRIER
   ↓
AI ASSISTS
   ↓
COMMUNITY DATA UPDATED
```

---

# 60. DESIGN DON'TS

The agent MUST NOT create:

- Generic admin dashboard aesthetic.
- Too many gradients.
- Glassmorphism everywhere.
- Excessive charts.
- Tiny text.
- Low contrast text.
- Icon-only navigation without labels.
- Hidden critical actions.
- Multiple competing primary CTAs.
- Excessive modals.
- Overly dense map controls.

---

# 61. FINAL PAGE BLUEPRINT

## Landing

```text
Header
Hero
Core Value
How It Works
Feature Preview
Community Value
CTA
Footer
```

## Home

```text
Greeting
Destination Search
Quick Actions
Nearby Updates
Saved Places
```

## Map

```text
Search
Profile Switcher
Map
Minimal Controls
Accessible Bottom Sheet / Side Panel
List Alternative
```

## Place

```text
Back
Place Header
Accessibility Score
Key Conditions
Facilities
Entrances
Reports
Route CTA
```

## Route

```text
Origin
Destination
Active Profile
Recommended Route
Alternatives
Route Details
```

## Journey

```text
Current Instruction
Next Warning
Audio Controls
Route Progress
Report Barrier CTA
```

## Report

```text
Report Method
Input
AI Assistance
Review
Submit
Success
```

## Community

```text
Filters
Recent Reports
Verification Status
Report Detail
```

---

# 62. DESIGN QA CHECKLIST

Before considering UI complete, verify:

## Visual

- [ ] Typography hierarchy is clear.
- [ ] Spacing is consistent.
- [ ] Colors are consistent.
- [ ] Buttons are obvious.
- [ ] No unnecessary visual clutter.

## Mobile

- [ ] Works at small screen sizes.
- [ ] Touch targets are large enough.
- [ ] Bottom navigation works.
- [ ] No horizontal overflow.

## Accessibility

- [ ] Keyboard navigation works.
- [ ] Focus is visible.
- [ ] Screen reader labels exist.
- [ ] Contrast is sufficient.
- [ ] Color is not the only meaning.
- [ ] Maps have list alternatives.
- [ ] Text can scale.

## UX

- [ ] Every page has a clear primary action.
- [ ] Loading states exist.
- [ ] Empty states exist.
- [ ] Error states exist.
- [ ] Forms provide clear validation.
- [ ] AI suggestions can be reviewed.

---

# 63. AGENT DESIGN IMPLEMENTATION RULES

## RULE 1

Do not design accessibility as a separate settings page only.

Accessibility must exist by default.

## RULE 2

Do not sacrifice usability for visual trends.

## RULE 3

Do not add visual elements just to make the page look "cool".

## RULE 4

Always prioritize readable content over decorative content.

## RULE 5

Do not use dummy charts or fake statistics.

## RULE 6

Do not make every section a card.

## RULE 7

Every core feature must work on mobile.

## RULE 8

Every critical action must have clear feedback.

## RULE 9

Use consistent components.

## RULE 10

When unsure, simplify.

---

# 64. FINAL DESIGN DIRECTION

BLINDSPOT should feel like:

> **A modern, calm, intelligent accessibility companion.**

The experience should communicate:

```text
SAFE
CLEAR
FRIENDLY
MODERN
INCLUSIVE
TRUSTWORTHY
```

The user should never feel overwhelmed.

The user should always understand:

1. What information is available.
2. What is verified.
3. What barriers may exist.
4. What action they can take next.

---

# 65. DESIGN SUCCESS CRITERIA

The design is successful when:

- A first-time user understands the product quickly.
- A tunanetra user can access critical information without relying on the map visually.
- A wheelchair user can quickly understand mobility barriers.
- The UI feels modern without being complicated.
- Navigation requires minimal cognitive effort.
- Reporting a barrier is fast.
- AI feels helpful rather than gimmicky.
- The product looks polished enough for a competition presentation.
- The product remains realistic enough to become a real application.

---

# FINAL INSTRUCTION TO THE DESIGN AGENT

Build BLINDSPOT as a **premium consumer accessibility product**, not as a government dashboard and not as a generic template.

Prioritize:

```text
CLARITY
↓
ACCESSIBILITY
↓
EASE OF USE
↓
BEAUTY
↓
DELIGHT
```

Never reverse this priority.

A beautiful interface that is difficult to use is not a successful BLINDSPOT design.

The final UI must make users feel:

> **"I understand where I am, what barriers may exist, and what I should do next."**

---

# END OF DESIGN.md
