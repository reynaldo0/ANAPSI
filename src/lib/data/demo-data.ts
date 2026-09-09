import type { LayerKind } from "@/lib/data/layers";
import type { VerificationStatus } from "@/types";

export const DEMO_SOURCE_LABEL = "demo";

export type DemoEntranceType = "MAIN" | "ALTERNATE" | "SERVICE";

export interface DemoEntrance {
  id: string;
  name: string;
  type: DemoEntranceType;
  steps: number;
  hasRamp: boolean;
  widthCm: number | null;
  notes: string | null;
}

export interface DemoPlace {
  id: string;
  name: string;
  address: string;
  city: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  entrances: DemoEntrance[];
}

export interface DemoFeature {
  id: string;
  kind: LayerKind;
  status: string;
  lat: number;
  lng: number;
  placeId?: string;
  verification: VerificationStatus;
  stepCount?: number | null;
}

export interface DemoReport {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  verification: VerificationStatus;
  authorName: string;
  createdAt: string;
  agree: number;
  disagree: number;
  placeId: string;
}

/**
 * DATA DEMO / "MOCK" UNTUK PENGEMBANGAN (RULE 1).
 * Bukan kondisi nyata; selalu tampilkan label sumber "data demo".
 */
export const demoPlaces: DemoPlace[] = [
  {
    id: "place-unj",
    name: "Universitas Negeri Jakarta",
    address: "Jl. Rawamangun Muka Raya No. 11",
    city: "Jakarta Pusat",
    category: "Pendidikan",
    description: "Kampus utama UNJ. Area Gedung Dekanat dan perpustakaan.",
    lat: -6.2012,
    lng: 106.8741,
    entrances: [
      {
        id: "ent-unj-1",
        name: "Pintu Depan",
        type: "MAIN",
        steps: 3,
        hasRamp: true,
        widthCm: 120,
        notes: "Ramp permanen tersedia di sisi kiri.",
      },
      {
        id: "ent-unj-2",
        name: "Gerbang Samping",
        type: "ALTERNATE",
        steps: 0,
        hasRamp: true,
        widthCm: 150,
        notes: "Akses rata tanpa tangga.",
      },
    ],
  },
  {
    id: "place-marison",
    name: "Marison Cafe Rawamangun",
    address: "Jl. Pemuda No. 58",
    city: "Jakarta Pusat",
    category: "Kuliner",
    description: "Cafe dengan area outdoor dan indoor.",
    lat: -6.1998,
    lng: 106.8755,
    entrances: [
      {
        id: "ent-marison-1",
        name: "Pintu Utama",
        type: "MAIN",
        steps: 1,
        hasRamp: false,
        widthCm: 90,
        notes: "Ada satu anak tangga kecil di pintu masuk.",
      },
    ],
  },
  {
    id: "place-puskesmas",
    name: "Puskesmas Kecamatan Pulo Gadung",
    address: "Jl. Raya Pulo Gadung No. 1",
    city: "Jakarta Timur",
    category: "Kesehatan",
    description: "Layanan kesehatan umum dan KIA.",
    lat: -6.1938,
    lng: 106.8881,
    entrances: [
      {
        id: "ent-pusk-1",
        name: "Pintu Layanan",
        type: "MAIN",
        steps: 2,
        hasRamp: false,
        widthCm: 110,
        notes: "Petugas membantu membuka pintu lebar.",
      },
      {
        id: "ent-pusk-2",
        name: "Pintu Darurat",
        type: "SERVICE",
        steps: 0,
        hasRamp: true,
        widthCm: 180,
        notes: "Ramp landai, digunakan untuk brankar.",
      },
    ],
  },
  {
    id: "place-masjid",
    name: "Masjid Baitul Iman Rawamangun",
    address: "Jl. Rawamangun Muka Timur",
    city: "Jakarta Pusat",
    category: "Ibada",
    description: "Masjid lingkungan dengan area parkir dan tempat wudhu.",
    lat: -6.1977,
    lng: 106.8784,
    entrances: [
      {
        id: "ent-masjid-1",
        name: "Pintu Kiri",
        type: "MAIN",
        steps: 4,
        hasRamp: true,
        widthCm: 140,
        notes: "Ramp tersedia samping kiri.",
      },
      {
        id: "ent-masjid-2",
        name: "Pintu Belakang",
        type: "ALTERNATE",
        steps: 0,
        hasRamp: false,
        widthCm: 200,
        notes: "Akses rata dari halaman parkir.",
      },
    ],
  },
  {
    id: "place-halte",
    name: "Halte Transjakarta Rawamangun",
    address: "Jl. Pemuda, seberang ATM Center",
    city: "Jakarta Timur",
    category: "Transportasi",
    description: "Halte BRT koridor utama Rawamangun.",
    lat: -6.1995,
    lng: 106.8799,
    entrances: [
      {
        id: "ent-halte-1",
        name: "Akses Barat",
        type: "MAIN",
        steps: 6,
        hasRamp: false,
        widthCm: 100,
        notes: "Tangga curam; tidak ada ramp atau elevator ke peron.",
      },
    ],
  },
  {
    id: "place-rptra",
    name: "RPTRA Rawamangun",
    address: "Jl. K.H. Abdullah Syafei",
    city: "Jakarta Pusat",
    category: "Rekreasi",
    description: "Ruang publik terpadu ramah anak dengan taman dan jogging track.",
    lat: -6.1924,
    lng: 106.8695,
    entrances: [
      {
        id: "ent-rptra-1",
        name: "Gerbang Utama",
        type: "MAIN",
        steps: 0,
        hasRamp: true,
        widthCm: 240,
        notes: "Gerbang lebar, jalur rata masuk taman.",
      },
    ],
  },
  {
    id: "place-stasiun",
    name: "Stasiun LRT Velodrome",
    address: "Jl. Pemuda",
    city: "Jakarta Timur",
    category: "Transportasi",
    description: "Stasiun LRT dengan akses jembatan penyeberangan.",
    lat: -6.1945,
    lng: 106.8832,
    entrances: [
      {
        id: "ent-stasiun-1",
        name: "Tangga + Eskalator",
        type: "MAIN",
        steps: 24,
        hasRamp: false,
        widthCm: 150,
        notes: "Tersedia eskalator; lift menuju peron belum beroperasi.",
      },
    ],
  },
  {
    id: "place-library",
    name: "Perpustakaan Umum Rawamangun",
    address: "Jl. Pemuda No. 12",
    city: "Jakarta Timur",
    category: "Pendidikan",
    description: "Perpustakaan umum dengan ruang baca dan akses internet.",
    lat: -6.2008,
    lng: 106.8777,
    entrances: [
      {
        id: "ent-lib-1",
        name: "Pintu Akses",
        type: "MAIN",
        steps: 0,
        hasRamp: true,
        widthCm: 160,
        notes: "Pintu otomatis dan ramp landai.",
      },
    ],
  },
];

const V: VerificationStatus = "VERIFIED";
const C: VerificationStatus = "COMMUNITY_REPORTED";
const U: VerificationStatus = "UNKNOWN";
const VERIFIED: VerificationStatus = "VERIFIED";

export const demoMapFeatures: DemoFeature[] = [
  { id: "gb-1", kind: "guiding_block", status: "available", lat: -6.2009, lng: 106.8743, placeId: "place-unj", verification: V },
  { id: "gb-2", kind: "guiding_block", status: "damaged", lat: -6.1997, lng: 106.8762, placeId: "place-marison", verification: C },
  { id: "gb-3", kind: "guiding_block", status: "interrupted", lat: -6.1986, lng: 106.8781, verification: C },
  { id: "pc-1", kind: "pedestrian_crossing", status: "signalized", lat: -6.2003, lng: 106.8766, placeId: "place-marison", verification: V },
  { id: "pc-2", kind: "pedestrian_crossing", status: "non_signalized", lat: -6.1961, lng: 106.8792, verification: U },
  { id: "ac-1", kind: "audio_crossing_signal", status: "available", lat: -6.2003, lng: 106.8766, placeId: "place-marison", verification: V },
  { id: "ob-1", kind: "obstacle", status: "construction", lat: -6.1993, lng: 106.8756, verification: C },
  { id: "ob-2", kind: "obstacle", status: "permanent", lat: -6.1978, lng: 106.8776, verification: C },
  { id: "ob-3", kind: "obstacle", status: "temporary", lat: -6.2016, lng: 106.8739, verification: U },
  { id: "gb-4", kind: "guiding_block", status: "available", lat: -6.2004, lng: 106.8779, placeId: "place-library", verification: V },
  { id: "gb-5", kind: "guiding_block", status: "interrupted", lat: -6.198, lng: 106.8784, placeId: "place-masjid", verification: C },
  { id: "gb-6", kind: "guiding_block", status: "available", lat: -6.1926, lng: 106.8697, placeId: "place-rptra", verification: V },
  { id: "gb-7", kind: "guiding_block", status: "damaged", lat: -6.1943, lng: 106.8878, placeId: "place-puskesmas", verification: C },
  { id: "pc-3", kind: "pedestrian_crossing", status: "signalized", lat: -6.1943, lng: 106.8834, placeId: "place-stasiun", verification: V },
  { id: "pc-4", kind: "pedestrian_crossing", status: "available", lat: -6.1936, lng: 106.8884, placeId: "place-puskesmas", verification: C },
  { id: "ac-2", kind: "audio_crossing_signal", status: "available", lat: -6.1945, lng: 106.8833, placeId: "place-stasiun", verification: V },
  { id: "ob-4", kind: "obstacle", status: "permanent", lat: -6.2005, lng: 106.8779, placeId: "place-library", verification: C },
  { id: "ob-5", kind: "obstacle", status: "temporary", lat: -6.1923, lng: 106.8696, placeId: "place-rptra", verification: C },
  { id: "sh-4", kind: "surface_hazard", status: "damaged_sidewalk", lat: -6.194, lng: 106.8879, placeId: "place-puskesmas", verification: C },
  { id: "sh-5", kind: "surface_hazard", status: "uneven_surface", lat: -6.1939, lng: 106.888, placeId: "place-puskesmas", verification: U },
  { id: "sh-1", kind: "surface_hazard", status: "hole", lat: -6.2014, lng: 106.8742, placeId: "place-unj", verification: C },
  { id: "sh-2", kind: "surface_hazard", status: "damaged_sidewalk", lat: -6.1999, lng: 106.8802, placeId: "place-halte", verification: C },
  { id: "sh-3", kind: "surface_hazard", status: "uneven_surface", lat: -6.1952, lng: 106.8869, verification: U },
  { id: "rm-1", kind: "ramp", status: "available", lat: -6.2012, lng: 106.8740, placeId: "place-unj", verification: V },
  { id: "rm-2", kind: "ramp", status: "damaged", lat: -6.1951, lng: 106.8829, placeId: "place-masjid", verification: C },
  { id: "st-1", kind: "stairs", status: "present", stepCount: 6, lat: -6.1994, lng: 106.8799, placeId: "place-halte", verification: V },
  { id: "ev-1", kind: "elevator", status: "out_of_service", lat: -6.1946, lng: 106.8831, placeId: "place-stasiun", verification: C },
  { id: "pw-1", kind: "path_width", status: "limited", lat: -6.1980, lng: 106.8780, verification: U },
  { id: "pw-2", kind: "path_width", status: "accessible", lat: -6.2010, lng: 106.8744, placeId: "place-unj", verification: V },
  { id: "pw-3", kind: "path_width", status: "limited", lat: -6.198, lng: 106.8783, placeId: "place-masjid", verification: U },
  { id: "pw-4", kind: "path_width", status: "accessible", lat: -6.1925, lng: 106.8696, placeId: "place-rptra", verification: V },
  { id: "pw-5", kind: "path_width", status: "accessible", lat: -6.2007, lng: 106.8778, placeId: "place-library", verification: V },
  { id: "sc-1", kind: "surface_condition", status: "damaged", lat: -6.2001, lng: 106.8804, placeId: "place-halte", verification: C },
  { id: "sc-2", kind: "surface_condition", status: "good", lat: -6.1924, lng: 106.8695, placeId: "place-rptra", verification: V },
  { id: "sc-3", kind: "surface_condition", status: "uneven", lat: -6.1941, lng: 106.8877, placeId: "place-puskesmas", verification: C },
  { id: "ae-1", kind: "accessible_entrance", status: "accessible", lat: -6.20105, lng: 106.87405, placeId: "place-unj", verification: V },
  { id: "ae-2", kind: "accessible_entrance", status: "partially_accessible", lat: -6.19982, lng: 106.87548, placeId: "place-marison", verification: C },
  { id: "ae-4", kind: "accessible_entrance", status: "partially_accessible", lat: -6.1939, lng: 106.8882, placeId: "place-puskesmas", verification: C },
  { id: "ae-5", kind: "accessible_entrance", status: "accessible", lat: -6.1925, lng: 106.8694, placeId: "place-rptra", verification: V },
  { id: "ae-6", kind: "accessible_entrance", status: "accessible", lat: -6.2009, lng: 106.8776, placeId: "place-library", verification: V },
  { id: "ae-3", kind: "accessible_entrance", status: "not_accessible", lat: -6.19951, lng: 106.87994, placeId: "place-halte", verification: V },
];

export const demoReports: DemoReport[] = [
  {
    id: "rep-1",
    title: "Trotoar keluar kampus rusak",
    excerpt: "Trotoar di depan pintu samping ada lubang besar setelah hujan.",
    status: "VERIFIED",
    verification: VERIFIED,
    authorName: "Demo Tunanetra",
    createdAt: "2026-08-21",
    agree: 3,
    disagree: 0,
    placeId: "place-unj",
  },
  {
    id: "rep-2",
    title: "Toilet ramah kursi roda tersedia",
    excerpt: "Tersedia toilet khusus aksesibel di lantai 1.",
    status: "ACTIVE",
    verification: C,
    authorName: "Demo Kursi Roda",
    createdAt: "2026-08-18",
    agree: 2,
    disagree: 1,
    placeId: "place-marison",
  },
  {
    id: "rep-3",
    title: "Guiding block terputus di perempatan",
    excerpt: "Marka taktil hilang sekitar 5 meter sebelum zebra crossing.",
    status: "PENDING",
    verification: C,
    authorName: "Anonim",
    createdAt: "2026-08-25",
    agree: 1,
    disagree: 0,
    placeId: "place-unj",
  },
  {
    id: "rep-4",
    title: "Elevator stasiun tidak beroperasi",
    excerpt: "Lift menuju peron sudah dua minggu diperbaiki.",
    status: "VERIFIED",
    verification: VERIFIED,
    authorName: "Demo Kursi Roda",
    createdAt: "2026-08-28",
    agree: 4,
    disagree: 0,
    placeId: "place-stasiun",
  },
];