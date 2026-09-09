# BLINDSPOT — REQUIREMENT.md

> **Project:** BLINDSPOT  
> **Tagline:** Navigate Beyond Barriers  
> **Product Type:** Web-based Personalized Accessibility Navigation Platform  
> **Primary Focus:** Tunanetra dan tunadaksa, khususnya pengguna kursi roda  
> **Status:** Competition MVP / Production-ready prototype specification

---

# 1. PROJECT OVERVIEW

## 1.1 Background

BLINDSPOT adalah platform pemetaan aksesibilitas berbasis **crowdsourcing, kecerdasan buatan, dan personalisasi kebutuhan pengguna**.

Masalah utama yang ingin diselesaikan bukan hanya menemukan lokasi atau rute tercepat, tetapi menjawab pertanyaan:

> **"Apakah saya dapat mencapai tujuan ini dengan aman dan mandiri sesuai kebutuhan mobilitas saya?"**

Sebuah lokasi atau rute tidak dapat diberi satu label universal seperti "aksesibel" atau "tidak aksesibel".

Contoh:

- Jalur dengan guiding block dapat membantu tunanetra.
- Jalur yang sama dapat tetap sulit digunakan pengguna kursi roda apabila permukaannya rusak atau terlalu sempit.
- Gedung dapat memiliki ramp tetapi tetap memiliki hambatan pada pintu masuk tertentu.
- Rute tercepat belum tentu merupakan rute paling aman atau paling mudah diakses.

Karena itu, BLINDSPOT harus menghasilkan informasi aksesibilitas yang **berbeda berdasarkan kebutuhan pengguna**.

---

# 2. PRODUCT VISION

## 2.1 Core Value Proposition

BLINDSPOT membantu pengguna:

1. Mengetahui kondisi aksesibilitas sebuah tempat.
2. Mengetahui hambatan sebelum melakukan perjalanan.
3. Membandingkan rute berdasarkan tingkat aksesibilitas.
4. Memilih jalur yang paling sesuai dengan kebutuhan mobilitas.
5. Melaporkan hambatan yang ditemukan di dunia nyata.
6. Memverifikasi dan memperbarui data aksesibilitas bersama komunitas.

## 2.2 Product Principle

BLINDSPOT bukan:

- Google Maps clone.
- Dashboard statistik biasa.
- Super-app untuk semua kebutuhan disabilitas.
- Chatbot umum tanpa fungsi nyata.

BLINDSPOT adalah:

> **Personalized Accessibility Intelligence for Every Journey.**

---

# 3. TARGET USERS

## 3.1 Primary User A — Tunanetra

Kebutuhan utama:

- Informasi jalur pedestrian.
- Informasi guiding block.
- Informasi hambatan di jalur.
- Informasi penyeberangan.
- Informasi fasilitas navigasi.
- Informasi dalam format audio.
- Interaksi yang kompatibel dengan screen reader dan keyboard.

## 3.2 Primary User B — Tunadaksa / Wheelchair User

Kebutuhan utama:

- Informasi ramp.
- Informasi tangga.
- Informasi lift.
- Informasi lebar jalur.
- Informasi kondisi permukaan.
- Informasi pintu masuk yang aksesibel.
- Informasi fasilitas aksesibel.

## 3.3 Secondary User — Kontributor Umum

Pengguna umum dapat:

- Melaporkan hambatan.
- Mengunggah foto.
- Menambahkan informasi fasilitas.
- Memverifikasi laporan pengguna lain.

## 3.4 Secondary User — Administrator

Administrator dapat:

- Memoderasi laporan.
- Mengelola kategori.
- Meninjau laporan bermasalah.
- Menandai laporan sebagai valid/tidak valid.
- Mengelola data lokasi dan fasilitas.

---

# 4. CORE PRODUCT FLOW

## 4.1 Main Journey

```text
OPEN BLINDSPOT
        ↓
ONBOARDING
        ↓
SELECT ACCESSIBILITY PROFILE
        ↓
SEARCH DESTINATION
        ↓
VIEW ACCESSIBILITY INFORMATION
        ↓
COMPARE AVAILABLE ROUTES
        ↓
SELECT MOST SUITABLE ROUTE
        ↓
VIEW JOURNEY BRIEF
        ↓
START NAVIGATION
        ↓
REPORT / VERIFY CONDITIONS
```

## 4.2 Accessibility Data Lifecycle

```text
USER REPORT
     ↓
AI STRUCTURING / ANALYSIS
     ↓
USER CONFIRMATION
     ↓
PENDING REVIEW
     ↓
COMMUNITY / ADMIN VERIFICATION
     ↓
ACTIVE ON MAP
     ↓
UPDATED / OUTDATED / RESOLVED
```

---

# 5. USER ROLES

## 5.1 Guest

Can:

- View landing page.
- Explore selected public map data.
- Search public locations.

Cannot:

- Submit reports.
- Verify reports.
- Save preferences.
- Access personalized history.

## 5.2 Registered User

Can:

- Save accessibility profile.
- Create reports.
- Upload evidence.
- Verify reports.
- Save locations.
- View report history.

## 5.3 Admin

Can:

- Manage reports.
- Manage users.
- Moderate content.
- Resolve disputes.
- Manage categories.
- Review flagged submissions.

---

# 6. PRIMARY ACCESSIBILITY PROFILES

The system MUST support profile-based personalization.

## 6.1 Visual Navigation Profile

Profile ID:

```text
VISUAL_NAVIGATION
```

Priority data:

- Guiding block.
- Tactile navigation information.
- Pedestrian crossing.
- Audio crossing signal.
- Sidewalk condition.
- Obstacles.
- Temporary barriers.

## 6.2 Wheelchair Mobility Profile

Profile ID:

```text
WHEELCHAIR_MOBILITY
```

Priority data:

- Ramp.
- Stairs.
- Elevator.
- Surface condition.
- Path width.
- Slope.
- Accessible entrance.
- Accessible facilities.

## 6.3 Multiple Profiles

Architecture MUST allow users to have multiple accessibility preferences in the future.

MVP UI should support selecting one active profile at a time.

The active profile MUST affect:

- Map layers.
- Route ranking.
- Accessibility score.
- Warnings.
- Journey brief.
- AI recommendations.

---

# 7. FUNCTIONAL REQUIREMENTS

---

# FR-001 — AUTHENTICATION

## Requirements

The application MUST provide:

- Registration.
- Login.
- Logout.
- Session persistence.
- Password validation.
- Protected authenticated routes.

## Recommended MVP Authentication

- Email + password.
- Optional Google OAuth if implementation time allows.

## Acceptance Criteria

- User can register successfully.
- User can login successfully.
- Unauthorized users cannot access protected pages.
- User session persists after refresh according to authentication provider configuration.

---

# FR-002 — ONBOARDING

## Purpose

Identify the user's primary accessibility needs.

## Flow

### Step 1

Welcome:

> "How do you navigate the world?"

### Step 2

Options:

- 👁️ Visual Navigation
- ♿ Wheelchair Mobility

### Step 3

Explain that preferences personalize the map and route.

### Step 4

Save active profile.

## Acceptance Criteria

- User can select a profile.
- Profile is stored persistently for authenticated users.
- User can change profile later.
- Selected profile changes map and route behavior.

---

# FR-003 — PERSONALIZED ACCESSIBILITY MAP

## Purpose

Display real-world accessibility information spatially.

## Required Capabilities

- Interactive map.
- Current user location when permission is granted.
- Search location.
- Zoom.
- Pan.
- Map markers.
- Layer controls.
- Marker clustering if data volume requires it.
- Accessible alternative list view.

## IMPORTANT

The map MUST NOT be the only way to access information.

All important information shown visually on the map MUST also be available through:

- List view.
- Accessible cards.
- Text descriptions.
- Screen-reader compatible content.

---

# FR-004 — MAP LAYERS FOR TUNANETRA

The Visual Accessibility Layer MUST support:

## Guiding Block

Fields:

- Available.
- Damaged.
- Interrupted.
- Unknown.

## Pedestrian Crossing

Fields:

- Available.
- Signalized.
- Non-signalized.
- Unknown.

## Audio Crossing Signal

Fields:

- Available.
- Unavailable.
- Unknown.

## Obstacles

Categories:

- Construction.
- Permanent obstacle.
- Temporary obstacle.
- Street furniture.
- Other.

## Surface Hazard

Categories:

- Hole.
- Damaged sidewalk.
- Uneven surface.
- Other.

---

# FR-005 — MAP LAYERS FOR WHEELCHAIR USERS

The Mobility Accessibility Layer MUST support:

## Ramp

Fields:

- Available.
- Damaged.
- Unknown.

Optional metadata:

- Slope estimate.
- Surface condition.

## Stairs

Fields:

- Present.
- Number of steps if known.

## Elevator

Fields:

- Available.
- Unavailable.
- Out of service.
- Unknown.

## Path Width

Status:

- Accessible.
- Limited.
- Too narrow.
- Unknown.

## Surface Condition

Status:

- Good.
- Uneven.
- Damaged.
- Blocked.

## Accessible Entrance

Status:

- Accessible.
- Partially accessible.
- Not accessible.
- Unknown.

---

# FR-006 — LOCATION SEARCH

Users MUST be able to:

- Search destination.
- Select a destination.
- View location details.

Location detail MUST include:

- Name.
- Address.
- Coordinates.
- Accessibility score.
- Accessibility facilities.
- Known barriers.
- Recent reports.
- Verification status.
- Last updated information.

---

# FR-007 — LOCATION ACCESSIBILITY PROFILE

Each location MUST support separate accessibility information.

Example:

```text
Visual Accessibility
85 / 100

Wheelchair Accessibility
72 / 100
```

The system MUST NOT combine all accessibility needs into one universal score only.

---

# FR-008 — ACCESSIBILITY SCORE

## Purpose

Give users a simple summary of accessibility conditions.

## Visual Accessibility Score Inputs

Recommended factors:

- Guiding block availability.
- Pedestrian route condition.
- Obstacles.
- Crossing accessibility.
- Data freshness.

## Wheelchair Accessibility Score Inputs

Recommended factors:

- Ramp availability.
- Stairs/barriers.
- Surface condition.
- Path width.
- Accessible entrance.
- Data freshness.

## Score Requirements

The score MUST:

- Be between 0 and 100.
- Have an explanation.
- Show contributing factors.
- Indicate data confidence/freshness.
- Avoid presenting old or insufficient data as highly reliable.

## Suggested Labels

- 80–100: Highly Accessible
- 60–79: Partially Accessible
- 40–59: Limited Accessibility
- 0–39: Significant Barriers

The UI MUST clearly state that the score is based on available reported data and is not a guarantee of real-world safety.

---

# FR-009 — ACCESSIBLE ROUTE PLANNER

## User Input

- Origin.
- Destination.
- Active accessibility profile.

## Output

The system SHOULD provide:

- Route geometry.
- Distance.
- Estimated travel time.
- Accessibility score.
- Detected barriers.
- Relevant facilities.

## Route Types

### Fastest Route

Optimized primarily for time.

### Most Accessible Route

Optimized primarily for accessibility.

## Important Architecture Requirement

The application MUST NOT claim that it can calculate a truly barrier-free route unless sufficient accessibility data exists for the route network.

If complete routing data is unavailable, the system MUST label output honestly, for example:

> "Accessibility-informed route based on currently available community data."

---

# FR-010 — VISUAL NAVIGATION MODE

## Purpose

Provide a tunanetra-oriented journey experience.

## Required Features

- Audio route instructions.
- Text-to-speech.
- Current step information.
- Repeat instruction button.
- Upcoming barrier warning.
- Route accessibility summary.

## Voice Commands (Optional Advanced Feature)

Examples:

- "Ulangi instruksi."
- "Ada hambatan apa?"
- "Berapa jauh lagi?"

Voice commands MUST have a non-voice alternative.

---

# FR-011 — WHEELCHAIR NAVIGATION MODE

## Purpose

Provide mobility-oriented route information.

## Required Features

- Highlight accessible segments.
- Highlight stairs.
- Highlight ramps.
- Highlight narrow paths.
- Highlight poor surface conditions.
- Show recommended route.

The system SHOULD explain why a route is recommended.

Example:

> "Recommended because this route avoids two reported stair barriers and includes a verified accessible entrance."

---

# FR-012 — JOURNEY ACCESSIBILITY BRIEF

Before navigation starts, the system MUST generate a summary.

## Required Output

- Destination.
- Route distance.
- Estimated time.
- Accessibility score.
- Number of known barriers.
- Key warnings.
- Recommended facilities.

## Example

```text
Accessibility Brief

Route Score: 88/100

Things to know:
- One damaged sidewalk reported.
- Ramp available near destination.
- Main entrance contains stairs.
- Recommended entrance: East Entrance.
```

For Visual Navigation Profile, the brief MUST support text-to-speech.

---

# FR-013 — ENTRANCE ACCESSIBILITY GUIDE

## Purpose

Help wheelchair users identify the best way to enter a building.

Each location MAY contain multiple entrances.

Entrance data:

- Entrance name.
- Coordinates.
- Accessibility status.
- Ramp availability.
- Stairs.
- Width information.
- Notes.
- Verification status.

The system SHOULD recommend the best entrance based on active profile.

---

# FR-014 — ACCESSIBLE FACILITY FINDER

Users MUST be able to search facilities.

## Wheelchair Filters

- Ramp.
- Elevator.
- Accessible toilet.
- Accessible entrance.
- Accessible parking.

## Visual Navigation Filters

- Guiding block.
- Audio crossing.
- Tactile information.

Results MUST show:

- Facility name.
- Distance.
- Accessibility status.
- Last verification date.

---

# FR-015 — VOICE REPORT

## Purpose

Allow users to report accessibility issues without typing.

## Flow

```text
PRESS RECORD
      ↓
RECORD VOICE
      ↓
SPEECH TO TEXT
      ↓
AI STRUCTURES REPORT
      ↓
USER REVIEWS RESULT
      ↓
USER CONFIRMS
      ↓
REPORT SUBMITTED
```

## AI Output Structure

The AI SHOULD extract:

- Category.
- Description.
- Affected profile.
- Severity.
- Suggested location if available.

## Critical Rule

AI-generated extraction MUST be editable by the user before submission.

The user remains the final confirmer of report content.

---

# FR-016 — TEXT REPORT

Users MUST be able to submit reports manually.

Required fields:

- Category.
- Description.
- Location.
- Affected profile.
- Optional severity.
- Optional photo.

---

# FR-017 — PHOTO REPORT

Users MUST be able to:

- Upload image.
- Add location.
- Add description.
- Submit report.

Supported validation:

- File type.
- File size.
- Upload status.

The application MUST display upload failure clearly.

---

# FR-018 — AI ACCESSIBILITY ANALYZER

## Purpose

Assist users in structuring reports from images.

Possible detected categories:

- Stairs.
- Ramp.
- Guiding block.
- Damaged sidewalk.
- Obstacle.

## Critical Requirements

AI detection MUST:

- Be treated as assistance, not absolute truth.
- Be editable.
- Require user confirmation before publication.

The UI MUST NOT claim that the AI guarantees accessibility or safety.

---

# FR-019 — COMMUNITY VERIFICATION

## Purpose

Maintain data freshness and reliability.

Users MAY:

- Confirm condition is still accurate.
- Report condition has changed.
- Add updated evidence.

## Report Status

- PENDING
- VERIFIED
- ACTIVE
- OUTDATED
- RESOLVED
- REJECTED

## Verification Data

- Verification count.
- Last verified date.
- Latest evidence.

The application SHOULD reduce confidence in old reports.

---

# FR-020 — REPORT LIFECYCLE

```text
PENDING
   ↓
VERIFIED
   ↓
ACTIVE
   ↓
OUTDATED / RESOLVED
```

Reports MUST NOT automatically disappear without status history.

---

# FR-021 — REPORT DETAILS

Each report MUST have:

- Unique ID.
- Category.
- Description.
- Coordinates.
- Reporter ID.
- Created date.
- Status.
- Severity.
- Verification information.
- Optional media.
- Updated date.

---

# FR-022 — AI ACCESSIBILITY ASSISTANT

## Purpose

Answer questions using BLINDSPOT data.

Example questions:

- "Apakah tempat ini aksesibel untuk kursi roda?"
- "Apa hambatan utama menuju lokasi?"
- "Di mana fasilitas yang memiliki ramp?"

## Critical Requirement

The assistant MUST prioritize:

1. Structured BLINDSPOT data.
2. Current report data.
3. Location data.

The assistant MUST clearly distinguish:

- Verified information.
- Community-reported information.
- Unknown information.

The AI MUST NOT invent accessibility conditions.

If data does not exist, respond:

> "Belum tersedia cukup data untuk memastikan kondisi tersebut."

---

# FR-023 — SCREEN READER COMPATIBILITY

The website MUST be designed for screen reader compatibility.

Requirements:

- Semantic HTML.
- Correct heading hierarchy.
- Accessible labels.
- Accessible buttons.
- Meaningful image alt text.
- Keyboard navigation.
- Visible focus indicators.
- Skip navigation link.
- ARIA only where semantic HTML is insufficient.
- No information communicated only through color.

---

# FR-024 — KEYBOARD NAVIGATION

All core functionality MUST be usable without a mouse.

Required:

- Tab navigation.
- Enter/Space activation.
- Escape for dismissing dialogs.
- Logical focus order.
- Focus trapping in modal dialogs.

---

# FR-025 — TEXT-TO-SPEECH

TTS MUST support:

- Location summaries.
- Accessibility briefs.
- Route information.
- Barrier descriptions.

Requirements:

- Play.
- Pause.
- Stop.
- Replay.

TTS controls MUST be accessible via keyboard.

---

# FR-026 — HIGH CONTRAST & LOW VISION SETTINGS

The application MUST provide:

- High contrast mode.
- Dark mode.
- Sufficient contrast.
- Text scaling compatibility.

Do not rely solely on custom modes; the interface MUST already have accessible baseline contrast.

---

# FR-027 — ACCESSIBLE ALTERNATIVE TO MAP

For every important map interaction, provide an alternative.

Examples:

- Nearby barriers list.
- Route steps list.
- Accessible facilities list.
- Searchable report list.

A user MUST NOT be blocked from core information because they cannot interact visually with the map.

---

# FR-028 — CURRENT LOCATION

If user grants permission:

- Get current location.
- Display location on map.
- Use as possible route origin.

If permission is denied:

- Application MUST continue working.
- User can manually enter origin.

---

# FR-029 — SAVE LOCATION

Authenticated users MAY:

- Save favorite places.
- Save frequent destinations.

---

# FR-030 — REPORT HISTORY

Users MUST be able to view:

- Submitted reports.
- Report status.
- Verification updates.
- Resolution status.

---

# FR-031 — ADMIN REPORT MODERATION

Admin MUST be able to:

- View pending reports.
- View flagged reports.
- Approve.
- Reject.
- Mark outdated.
- Mark resolved.
- Add moderation notes.

---

# 8. DATA MODEL

The exact database technology may vary, but the following logical entities are REQUIRED.

---

# 8.1 User

```text
User
- id
- name
- email
- password_hash / auth_provider
- role
- created_at
- updated_at
```

Role:

```text
USER
ADMIN
```

---

# 8.2 AccessibilityProfile

```text
AccessibilityProfile
- id
- user_id
- profile_type
- is_active
- created_at
- updated_at
```

Profile types:

```text
VISUAL_NAVIGATION
WHEELCHAIR_MOBILITY
```

---

# 8.3 Place

```text
Place
- id
- name
- address
- latitude
- longitude
- place_type
- description
- created_at
- updated_at
```

---

# 8.4 Entrance

```text
Entrance
- id
- place_id
- name
- latitude
- longitude
- accessibility_status
- has_ramp
- has_stairs
- width_status
- notes
- verification_status
```

---

# 8.5 AccessibilityFeature

```text
AccessibilityFeature
- id
- place_id / geographic_reference
- feature_type
- latitude
- longitude
- status
- metadata
- verification_status
- created_at
- updated_at
```

Example feature types:

```text
GUIDING_BLOCK
AUDIO_CROSSING
PEDESTRIAN_CROSSING
RAMP
STAIRS
ELEVATOR
ACCESSIBLE_TOILET
ACCESSIBLE_ENTRANCE
```

---

# 8.6 AccessibilityReport

```text
AccessibilityReport
- id
- reporter_id
- category
- description
- latitude
- longitude
- severity
- affected_profiles
- status
- ai_generated
- created_at
- updated_at
```

---

# 8.7 ReportMedia

```text
ReportMedia
- id
- report_id
- media_type
- media_url
- created_at
```

---

# 8.8 ReportVerification

```text
ReportVerification
- id
- report_id
- user_id
- verification_type
- comment
- created_at
```

Verification types:

```text
CONFIRMED
CHANGED
RESOLVED
```

---

# 8.9 AccessibilityScore

```text
AccessibilityScore
- id
- place_id
- profile_type
- score
- confidence
- calculated_at
```

---

# 8.10 SavedPlace

```text
SavedPlace
- id
- user_id
- place_id
- created_at
```

---

# 9. API REQUIREMENTS

The API architecture MUST support clear separation between:

- Authentication.
- User profile.
- Places.
- Accessibility data.
- Reports.
- Verification.
- AI processing.
- Routing.

Suggested REST API structure:

---

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Profile

```text
GET    /api/profile
PUT    /api/profile
GET    /api/profile/accessibility
PUT    /api/profile/accessibility
```

## Places

```text
GET /api/places
GET /api/places/:id
GET /api/places/:id/accessibility
GET /api/places/:id/entrances
```

## Map Features

```text
GET /api/map/features
GET /api/map/features?profile=VISUAL_NAVIGATION
GET /api/map/features?profile=WHEELCHAIR_MOBILITY
```

## Reports

```text
POST /api/reports
GET  /api/reports
GET  /api/reports/:id
PUT  /api/reports/:id
```

## Verification

```text
POST /api/reports/:id/verify
POST /api/reports/:id/changed
POST /api/reports/:id/resolved
```

## AI

```text
POST /api/ai/analyze-voice-report
POST /api/ai/analyze-image-report
POST /api/ai/assistant
```

## Routing

```text
POST /api/routes
```

Example request:

```json
{
  "origin": {
    "latitude": -6.2,
    "longitude": 106.8
  },
  "destination": {
    "latitude": -6.21,
    "longitude": 106.81
  },
  "profile": "WHEELCHAIR_MOBILITY"
}
```

---

# 10. FRONTEND REQUIREMENTS

## 10.1 Required Pages

```text
/
├── /
│   └── Landing Page
│
├── /login
├── /register
│
├── /onboarding
│
├── /map
│
├── /search
│
├── /places/[id]
│
├── /route
│
├── /journey
│
├── /report
│
├── /report/[id]
│
├── /community
│
├── /saved
│
├── /profile
│
└── /admin
```

---

# 11. PAGE REQUIREMENTS

---

# 11.1 LANDING PAGE

Purpose:

- Explain BLINDSPOT.
- Explain target users.
- Explain key features.
- Direct user to explore.

Required CTA:

- Explore Map.
- Start Navigation.
- Report a Barrier.

---

# 11.2 ONBOARDING PAGE

Required:

- Profile selection.
- Short explanation.
- Continue button.

---

# 11.3 MAP PAGE

Required:

- Search.
- Profile switcher.
- Layer filters.
- Markers.
- Accessible list view.
- Current location.
- Report CTA.

---

# 11.4 PLACE DETAIL PAGE

Required:

- Name.
- Accessibility scores.
- Facilities.
- Barriers.
- Entrances.
- Community reports.
- Verification status.
- Last updated.
- Start route button.

---

# 11.5 ROUTE PAGE

Required:

- Origin.
- Destination.
- Active profile.
- Route alternatives.
- Distance.
- Duration.
- Accessibility score.
- Barrier summary.

---

# 11.6 JOURNEY PAGE

Required:

- Current route information.
- Next instruction.
- Accessibility warnings.
- Audio controls.
- Repeat instruction.
- End journey.

---

# 11.7 REPORT PAGE

Required methods:

- Voice report.
- Text report.
- Photo report.

User MUST review data before submission.

---

# 11.8 COMMUNITY PAGE

Required:

- Recent reports.
- Verification status.
- Filter by profile.
- Filter by status.
- Report detail navigation.

---

# 11.9 PROFILE PAGE

Required:

- User information.
- Active accessibility profile.
- Appearance settings.
- Saved places.
- Report history.

---

# 11.10 ADMIN PAGE

Required:

- Pending reports.
- Verification queue.
- Flagged content.
- Report moderation.

Admin routes MUST be protected.

---

# 12. AI REQUIREMENTS

## 12.1 AI Must Be Useful

AI MUST perform concrete tasks.

Allowed primary uses:

- Voice report structuring.
- Image report assistance.
- Accessibility data summarization.
- Data-grounded accessibility assistant.

AI MUST NOT exist merely as a generic chatbot.

## 12.2 AI Hallucination Prevention

When answering accessibility questions, AI MUST:

- Use structured application data where available.
- Mention when data is verified.
- Mention when information is community-reported.
- Say when information is unavailable.

AI MUST NOT fabricate:

- Ramp availability.
- Guiding block availability.
- Route safety.
- Facility accessibility.

---

# 13. ROUTING REQUIREMENTS

## Critical Limitation

Routing quality depends on available geographic and accessibility data.

The implementation MUST separate:

### Base Route Data

Provided by a routing/map provider.

### Accessibility Intelligence

Provided by:

- BLINDSPOT reports.
- Verified features.
- Accessibility facilities.
- Barrier data.

## Recommended MVP Logic

1. Request base route.
2. Find accessibility reports near route segments.
3. Calculate route accessibility score.
4. Compare alternative routes if available.
5. Rank routes according to active profile.

The system MUST NOT falsely claim perfect barrier-free routing.

---

# 14. NON-FUNCTIONAL REQUIREMENTS

---

# NFR-001 — PERFORMANCE

Target:

- Initial UI should load efficiently.
- Map data should be fetched progressively.
- Large marker sets should use clustering or viewport-based loading.
- Images should be optimized.

---

# NFR-002 — RESPONSIVE DESIGN

The application MUST work on:

- Desktop.
- Tablet.
- Mobile.

Mobile is important because reporting and navigation occur outside.

---

# NFR-003 — ACCESSIBILITY

Core functionality MUST support:

- Keyboard.
- Screen reader.
- Visible focus.
- Sufficient contrast.
- Semantic structure.

Accessibility is a product requirement, not an optional feature.

---

# NFR-004 — ERROR HANDLING

Every async operation MUST have:

- Loading state.
- Success state.
- Error state.
- Retry option where appropriate.

Examples:

- Map fails.
- Location permission denied.
- Voice transcription fails.
- Image analysis fails.
- Report submission fails.
- Route generation fails.

The application MUST never leave users without understandable feedback.

---

# NFR-005 — EMPTY STATES

Every data-driven page MUST support meaningful empty states.

Examples:

- No reports nearby.
- No saved places.
- No accessible data available.
- No route alternatives.

Example:

> "Belum ada data aksesibilitas yang cukup untuk area ini. Kamu dapat membantu menambahkan informasi."

---

# NFR-006 — SECURITY

Minimum requirements:

- Validate all API input.
- Authorize protected operations.
- Restrict admin endpoints.
- Protect secrets in environment variables.
- Never expose AI or external API keys in frontend code.
- Validate uploaded files.
- Rate-limit sensitive endpoints if supported.

---

# NFR-007 — PRIVACY

Location and report data require careful handling.

Requirements:

- Ask permission before using current location.
- Do not expose unnecessary personal location history.
- Clearly distinguish report location from user identity.
- Avoid storing continuous location tracking unless explicitly required.

---

# 15. UI/UX PRINCIPLES

## Principle 1 — Simple

Do not overload screens.

## Principle 2 — One Primary Action

Each page should have a clear main action.

## Principle 3 — Accessibility First

Do not add accessibility after the UI is finished.

## Principle 4 — Information Before Decoration

Accessibility information is more important than visual decoration.

## Principle 5 — Clear Status

Use:

- Text.
- Icons.
- Labels.

Do not communicate status using color alone.

---

# 16. DESIGN SYSTEM REQUIREMENTS

Components should be reusable.

Required components:

```text
Button
IconButton
Input
SearchInput
Select
Modal
Drawer
Toast
Card
Badge
AccessibilityScore
MapMarker
ReportCard
VerificationBadge
AudioControl
ProfileSwitcher
RouteCard
EmptyState
ErrorState
LoadingState
```

---

# 17. TECHNICAL IMPLEMENTATION GUIDELINES

## Recommended Architecture

```text
Frontend
    ↓
Application API
    ↓
────────────────────────
│ Database             │
│ Map / Geocoding API  │
│ Routing API          │
│ AI Service           │
│ Storage              │
────────────────────────
```

## Suggested Stack

Frontend:

- Next.js
- TypeScript
- Tailwind CSS

Backend:

- Next.js API / Server Actions OR separate backend service.

Database:

- PostgreSQL recommended for relational and geographic data.

ORM:

- Prisma or equivalent.

Map:

- Map provider selected according to project requirements and budget.

Storage:

- Cloud object storage for report media.

AI:

- Speech-to-text service.
- LLM for structured extraction.
- Optional vision model for image analysis.

---

# 18. DATABASE AND GEO REQUIREMENTS

The system SHOULD support geographic queries:

- Nearby reports.
- Features within map viewport.
- Reports near a route.
- Nearest accessible facility.

Use a database design capable of supporting latitude/longitude queries.

For larger implementations, PostGIS or equivalent geospatial support is recommended.

---

# 19. STATE MANAGEMENT REQUIREMENTS

The application MUST manage:

- Authentication state.
- Active accessibility profile.
- Map viewport.
- Selected location.
- Route state.
- Report submission state.
- Audio state.

Avoid unnecessary global state.

Server data SHOULD use a proper data-fetching/cache strategy.

---

# 20. REQUIRED LOADING STATES

Every major feature MUST implement:

```text
IDLE
LOADING
SUCCESS
ERROR
```

Examples:

```text
Searching location...
Generating route...
Analyzing voice report...
Uploading image...
Submitting report...
```

---

# 21. REQUIRED ERROR MESSAGES

Examples:

## Location Permission Denied

> "Lokasi tidak diizinkan. Kamu tetap dapat memasukkan lokasi secara manual."

## Route Unavailable

> "Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain."

## Insufficient Accessibility Data

> "Belum tersedia cukup data aksesibilitas untuk memberikan rekomendasi yang andal."

## AI Analysis Failed

> "Analisis otomatis belum berhasil. Kamu tetap dapat mengisi laporan secara manual."

---

# 22. MVP PRIORITY

The agent MUST prioritize completing working core flows before adding experimental features.

## P0 — MUST HAVE

1. Authentication.
2. Accessibility profile.
3. Interactive map.
4. Visual and wheelchair map layers.
5. Place detail.
6. Accessibility score.
7. Route request and accessibility-informed route ranking.
8. Text report.
9. Voice report.
10. Community verification.
11. Screen-reader compatibility.
12. Accessible alternative to map.

## P1 — SHOULD HAVE

1. Text-to-speech.
2. Journey brief.
3. Entrance guide.
4. Facility finder.
5. Photo report.
6. AI voice structuring.

## P2 — ADVANCED / WOW FEATURE

1. AI image accessibility analysis.
2. Voice assistant commands.
3. Real-time obstacle detection.

P2 MUST NOT block completion of P0 and P1.

---

# 23. ACCEPTANCE TESTING

The project is NOT complete merely because pages exist.

The agent MUST verify the following flows.

---

## Test Flow A — Tunanetra

```text
Open application
→ Select Visual Navigation
→ Search location
→ Open place details
→ Read/listen to accessibility information
→ View barriers without relying only on map
→ Generate route
→ Receive accessibility brief
```

Expected:

All core information is accessible through keyboard and screen-reader compatible UI.

---

## Test Flow B — Wheelchair User

```text
Open application
→ Select Wheelchair Mobility
→ Search destination
→ View mobility score
→ View ramps/stairs/barriers
→ Generate route
→ Compare accessibility-informed route
→ View recommended entrance
```

---

## Test Flow C — Voice Report

```text
Login
→ Open report
→ Record voice
→ Transcribe
→ AI structure report
→ User edits result
→ Submit
→ Report becomes pending
```

---

## Test Flow D — Community Verification

```text
Open active report
→ Confirm condition
→ Verification count updates
→ Last verified date updates
```

---

## Test Flow E — No Data

```text
Search location without accessibility data
```

Expected:

The application MUST clearly say data is unavailable and MUST NOT invent a score or accessibility condition.

---

# 24. DEFINITION OF DONE

A feature is considered DONE only when:

- UI is implemented.
- Functional logic works.
- Loading state exists.
- Error state exists.
- Empty state exists where relevant.
- Mobile responsive.
- Keyboard accessible.
- Screen-reader labels are present.
- API errors are handled.
- Data is persisted where required.
- Feature has been manually tested.

---

# 25. AGENT IMPLEMENTATION RULES

## RULE 1

Do not create placeholder functionality and present it as working.

If an external integration is unavailable:

- Create a clearly labeled mock/development fallback.
- Do not misrepresent mock data as real-world data.

## RULE 2

Do not build P2 features before P0 is stable.

## RULE 3

Do not use AI-generated output as final truth without user confirmation or clear verification status.

## RULE 4

Do not make the map the only interface for accessibility information.

## RULE 5

Do not claim a route is completely barrier-free without sufficient data.

## RULE 6

Every API call must handle failure.

## RULE 7

Every form must validate input.

## RULE 8

All protected operations require authorization.

## RULE 9

Do not expose secrets in client-side code.

## RULE 10

Keep components reusable and avoid duplicating logic.

---

# 26. IMPLEMENTATION ORDER FOR AGENT

The agent SHOULD build in this order:

```text
PHASE 1
Project setup
↓
Authentication
↓
Database schema
↓
Accessibility profile

PHASE 2
Map integration
↓
Place system
↓
Accessibility features
↓
Map layers

PHASE 3
Place details
↓
Accessibility scoring
↓
Accessible information views

PHASE 4
Report system
↓
Text report
↓
Voice report
↓
Photo report

PHASE 5
Verification system
↓
Report lifecycle
↓
Community views

PHASE 6
Routing
↓
Route comparison
↓
Accessibility-informed ranking
↓
Journey brief

PHASE 7
AI integrations
↓
Voice structuring
↓
Data-grounded assistant
↓
Optional image analysis

PHASE 8
Accessibility audit
↓
Keyboard testing
↓
Screen-reader testing
↓
Mobile testing
↓
Error/empty-state audit
```

---

# 27. FINAL PRODUCT STATEMENT

BLINDSPOT must deliver one complete core experience:

> **A user selects their accessibility needs, searches for a destination, understands real-world accessibility conditions, receives an accessibility-informed route recommendation, and can contribute new information back to the community.**

The product must connect:

```text
PERSONALIZATION
      ↓
ACCESSIBILITY DATA
      ↓
MAP
      ↓
ROUTE
      ↓
JOURNEY INFORMATION
      ↓
COMMUNITY REPORTING
      ↓
VERIFICATION
      ↓
BETTER ACCESSIBILITY DATA
```

This loop is the core ecosystem of BLINDSPOT.

---

# 28. SUCCESS CRITERIA FOR COMPETITION MVP

The demo should successfully demonstrate:

1. A user chooses **Tunanetra** or **Wheelchair Mobility**.
2. The application changes accessibility information based on that choice.
3. The user searches a destination.
4. The user sees separate accessibility scores.
5. The user understands known barriers.
6. The user receives an accessibility-informed route recommendation.
7. A user submits a barrier report.
8. AI helps structure the report.
9. The user confirms the AI result.
10. The report enters the community verification lifecycle.

If these ten experiences work smoothly, BLINDSPOT has a complete, coherent, and demonstrable product story.

---

# END OF REQUIREMENT.md
