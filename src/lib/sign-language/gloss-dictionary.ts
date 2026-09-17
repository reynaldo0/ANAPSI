export type HandSide = "right" | "left" | "both";

export type HandShape = "palm" | "point" | "fist" | "open" | "cup" | "flat";

export type Eyes = "open" | "happy" | "concentrate" | "wink";
export type Mouth = "neutral" | "smile" | "open" | "flat";

export interface SignPose {
  id: string;
  label: string;
  description: string;
  activeHand: HandSide;
  handShape: HandShape;
  rightShoulder: number;
  rightElbow: number;
  leftShoulder: number;
  leftElbow: number;
  headTilt: number;
  eyes: Eyes;
  mouth: Mouth;
  nod: boolean;
  heldMs: number;
}

interface SignOptions {
  activeHand?: HandSide;
  handShape?: HandShape;
  rs?: number;
  re?: number;
  ls?: number;
  le?: number;
  headTilt?: number;
  eyes?: Eyes;
  mouth?: Mouth;
  nod?: boolean;
  heldMs?: number;
}

function sign(
  id: string,
  label: string,
  description: string,
  o: SignOptions = {},
): SignPose {
  return {
    id,
    label,
    description,
    activeHand: o.activeHand ?? "right",
    handShape: o.handShape ?? "palm",
    rightShoulder: o.rs ?? 0,
    rightElbow: o.re ?? 0,
    leftShoulder: o.ls ?? 0,
    leftElbow: o.le ?? 0,
    headTilt: o.headTilt ?? 0,
    eyes: o.eyes ?? "open",
    mouth: o.mouth ?? "neutral",
    nod: o.nod ?? false,
    heldMs: o.heldMs ?? 1150,
  };
}

export const IDLE_POSE: SignPose = sign("idle", "…", "Avatar dalam keadaan tenang.", { heldMs: 600 });

export const GESTURES: SignPose[] = [
  sign("halo", "halo", "Tangan terbuka menyapa, telapak menghadap ke depan.", {
    activeHand: "both",
    handShape: "flat",
    rs: 45,
    re: -15,
    ls: 45,
    le: -15,
    eyes: "happy",
    mouth: "smile",
  }),
  sign("tanya", "tanya", "Telunjuk menunjuk ke depan, kepala sedikit miring bertanya.", {
    handShape: "point",
    rs: 20,
    re: 20,
    headTilt: 6,
    eyes: "concentrate",
    mouth: "open",
  }),
  sign("seru", "seru", "Tangan mengepal di depan dada, mengangguk menegaskan.", {
    handShape: "fist",
    rs: 30,
    re: -20,
    nod: true,
    mouth: "open",
  }),
  sign("ya", "ya", "Mengangguk tanda setuju.", { nod: true, mouth: "smile" }),
  sign("tidak", "tidak", "Kepala menggeleng, telapak tangan terbuka.", {
    activeHand: "both",
    handShape: "palm",
    rs: 20,
    ls: 20,
    headTilt: -14,
    mouth: "flat",
  }),
  sign("tolong", "tolong", "Telapak tangan terbuka ke atas meminta bantuan.", {
    activeHand: "both",
    handShape: "palm",
    rs: 35,
    re: -5,
    ls: 35,
    le: -5,
    mouth: "open",
  }),
  sign("makasih", "terima kasih", "Satu tangan dari bibir bergerak keluar tanda berterima kasih.", {
    handShape: "palm",
    rs: 55,
    re: -60,
    mouth: "smile",
  }),
  sign("nama", "nama", "Dua jari telunjuk bergerak turun bersamaan.", {
    activeHand: "both",
    handShape: "point",
    rs: 25,
    re: 15,
    ls: 25,
    le: 15,
  }),
  sign("saya", "saya", "Telunjuk menunjuk ke arah diri sendiri.", {
    handShape: "point",
    rs: 30,
    re: -45,
  }),
  sign("cari", "cari", "Telunjuk menunjuk ke depan dan bergerak mencari.", {
    handShape: "point",
    rs: 30,
    re: 50,
    eyes: "concentrate",
  }),
  sign("mana", "mana", "Kedua tangan terbuka bertanya di depan.", {
    activeHand: "both",
    handShape: "open",
    rs: 20,
    re: -10,
    ls: 20,
    le: -10,
    headTilt: 6,
    eyes: "concentrate",
  }),
  sign("di", "di sini", "Telunjuk menunjuk ke bawah depan untuk menunjukkan tempat.", {
    handShape: "point",
    rs: 15,
    re: 30,
  }),
  sign("buka", "buka", "Kedua telapak terbuka ke luar.", {
    activeHand: "both",
    handShape: "open",
    rs: 60,
    re: 10,
    ls: 60,
    le: 10,
  }),
  sign("tutup", "tutup", "Kedua telapak menutup ke depan.", {
    activeHand: "both",
    handShape: "flat",
    rs: 45,
    re: -45,
    ls: 45,
    le: -45,
  }),
  sign("mulai", "mulai", "Kedua tangan terbuka menandakan permulaan, mengangguk.", {
    activeHand: "both",
    handShape: "open",
    rs: 55,
    re: -20,
    ls: 55,
    le: -20,
    nod: true,
  }),
  sign("berhenti", "berhenti", "Telapak terbuka ke depan tanda berhenti.", {
    handShape: "open",
    rs: 50,
    re: -30,
    mouth: "flat",
  }),
  sign("lanjut", "lanjut", "Kedua telunjuk mendorong ke depan.", {
    activeHand: "both",
    handShape: "point",
    rs: 30,
    re: 10,
    ls: 30,
    le: 10,
  }),
  sign("maju", "maju", "Kedua telapak mendorong maju ke depan.", {
    activeHand: "both",
    handShape: "flat",
    rs: 25,
    re: 15,
    ls: 25,
    le: 15,
  }),
  sign("kiri", "kiri", "Telunjuk menunjuk ke arah kiri.", {
    handShape: "point",
    ls: 75,
    le: 5,
  }),
  sign("kanan", "kanan", "Telunjuk menunjuk ke arah kanan.", {
    handShape: "point",
    rs: 75,
    re: 5,
  }),
  sign("lurus", "lurus", "Kedua tangan lurus menunjuk ke depan.", {
    activeHand: "both",
    handShape: "point",
    rs: 20,
    re: 5,
    ls: 20,
    le: 5,
  }),
  sign("belok", "belok", "Tangan menunjuk membentuk belokan ke depan.", {
    handShape: "point",
    rs: 30,
    re: 45,
    headTilt: 4,
  }),
  sign("samping", "samping", "Telapak terbuka di samping badan.", {
    handShape: "flat",
    rs: 40,
    re: -20,
    ls: 40,
    le: -20,
  }),
  sign("kembali", "kembali", "Kedua tangan ditarik mendekat ke tubuh.", {
    activeHand: "both",
    handShape: "flat",
    rs: 15,
    re: -70,
    ls: 15,
    le: -70,
  }),
  sign("masuk", "masuk", "Kedua telapak mendorong ke dalam.", {
    activeHand: "both",
    handShape: "flat",
    rs: 45,
    re: -30,
    ls: 45,
    le: -30,
  }),
  sign("keluar", "keluar", "Kedua telapak menarik ke luar.", {
    activeHand: "both",
    handShape: "open",
    rs: 40,
    re: 5,
    ls: 40,
    le: 5,
  }),
  sign("atas", "atas", "Telunjuk menunjuk ke atas.", {
    handShape: "point",
    rs: -95,
    re: -10,
    eyes: "concentrate",
  }),
  sign("bawah", "bawah", "Telunjuk menunjuk ke bawah.", {
    handShape: "point",
    rs: 10,
    re: 35,
  }),
  sign("naik", "naik", "Kedua tangan bergerak naik.", {
    activeHand: "both",
    handShape: "flat",
    rs: 60,
    re: -25,
    ls: 60,
    le: -25,
  }),
  sign("turun", "turun", "Kedua tangan bergerak turun.", {
    activeHand: "both",
    handShape: "flat",
    rs: 35,
    re: 40,
    ls: 35,
    le: 40,
  }),
  sign("tangga", "tangga", "Tangan bergantian menirukan anak tangga.", {
    activeHand: "both",
    handShape: "flat",
    rs: 50,
    re: -15,
    ls: 50,
    le: -15,
  }),
  sign("ramp", "ramp", "Telapak miring membentuk lereng yang landai.", {
    activeHand: "both",
    handShape: "flat",
    rs: 40,
    re: -20,
    ls: 40,
    le: -20,
    headTilt: 3,
  }),
  sign("pintu", "pintu", "Kedua telapak terbuka menutup seperti pintu.", {
    activeHand: "both",
    handShape: "flat",
    rs: 45,
    re: -40,
    ls: 45,
    le: -40,
  }),
  sign("jauh", "jauh", "Telapak menjauh dari tubuh.", {
    handShape: "palm",
    rs: 15,
    re: 55,
  }),
  sign("dekat", "dekat", "Telapak mendekat ke tubuh.", {
    handShape: "palm",
    rs: 20,
    re: -50,
  }),
  sign("besar", "besar", "Kedua tangan terbuka lebar.", {
    activeHand: "both",
    handShape: "open",
    rs: 75,
    re: 5,
    ls: 75,
    le: 5,
    mouth: "open",
  }),
  sign("kecil", "kecil", "Jari membentuk ukuran kecil.", {
    activeHand: "both",
    handShape: "cup",
    rs: 20,
    re: -30,
    ls: 20,
    le: -30,
    mouth: "flat",
  }),
  sign("banyak", "banyak", "Kedua tangan terbuka bergerak banyak.", {
    activeHand: "both",
    handShape: "open",
    rs: 45,
    re: -10,
    ls: 45,
    le: -10,
  }),
  sign("sedikit", "sedikit", "Kedua telapak membentuk sedikit.", {
    activeHand: "both",
    handShape: "cup",
    rs: 30,
    re: -20,
    ls: 30,
    le: -20,
  }),
  sign("awas", "awas", "Kedua telapak terbuka ke samping, peringatan waspada.", {
    activeHand: "both",
    handShape: "open",
    rs: 60,
    re: -35,
    ls: 60,
    le: -35,
    eyes: "concentrate",
    mouth: "open",
  }),
  sign("bahaya", "bahaya", "Kedua tangan mengepal ke atas tanda bahaya.", {
    activeHand: "both",
    handShape: "fist",
    rs: -70,
    re: -20,
    ls: -70,
    le: -20,
    mouth: "flat",
  }),
  sign("jatuh", "jatuh", "Kedua tangan menunjuk jatuh ke bawah.", {
    activeHand: "both",
    handShape: "point",
    rs: 60,
    re: 80,
    ls: 60,
    le: 80,
    mouth: "open",
  }),
  sign("rambu", "rambu", "Telunjuk menunjuk ke rambu di samping.", {
    handShape: "point",
    rs: 55,
    re: -30,
    eyes: "concentrate",
  }),
  sign("ada", "ada", "Satu tangan terbuka, mengangguk tanda tersedia.", {
    handShape: "open",
    rs: 30,
    re: -15,
    nod: true,
    mouth: "smile",
  }),
  sign("info", "info", "Telunjuk menunjuk ke kepala tanda informasi penting.", {
    handShape: "point",
    rs: 55,
    re: -5,
    eyes: "concentrate",
  }),
  sign("verifikasi", "terverifikasi", "Kedua tangan flat mengangguk tanda sudah pasti.", {
    activeHand: "both",
    handShape: "flat",
    rs: 35,
    re: -5,
    ls: 35,
    le: -5,
    nod: true,
    mouth: "smile",
  }),
  sign("lapor", "lapor", "Kedua tangan mengetuk meja tanda melapor.", {
    activeHand: "both",
    handShape: "flat",
    rs: 35,
    re: -15,
    ls: 35,
    le: -15,
  }),
  sign("bagus", "bagus", "Tangan mengepal dengan jempol ke atas.", {
    handShape: "fist",
    rs: 40,
    re: -25,
    mouth: "smile",
  }),
  sign("jalan", "jalan", "Kedua tangan bergerak bergantian seperti berjalan.", {
    activeHand: "both",
    handShape: "open",
    rs: 45,
    re: -20,
    ls: 45,
    le: -20,
  }),
  sign("peta", "peta", "Kedua tangan membuka seperti membuka peta.", {
    activeHand: "both",
    handShape: "flat",
    rs: 50,
    re: 20,
    ls: 50,
    le: 20,
  }),
  sign("tempat", "tempat", "Kedua tangan membentuk lokasi di depan.", {
    activeHand: "both",
    handShape: "flat",
    rs: 45,
    re: -10,
    ls: 45,
    le: -10,
  }),
];

export const GLOSS_BY_ID = new Map<string, SignPose>(GESTURES.map((g) => [g.id, g]));

export const FALLBACK_POSE = sign("fallback", "…", "Gerakan menunjuk kosong belum diketahui.", {
  handShape: "point",
  rs: 35,
  re: 30,
  mouth: "open",
});

const PHRASE_TO_GLOSS: Record<string, string> = {
  "terima kasih": "makasih",
  "terima kasih banyak": "makasih",
  "makasih": "makasih",
  "hati hati": "awas",
  "berhati hati": "awas",
  "hati-hati": "awas",
  "berhati-hati": "awas",
  "hatihati": "awas",
  "berhatihati": "awas",
  "waspada": "awas",
  "di sini": "di",
  "di sana": "di",
  "di situ": "di",
  "disini": "di",
  "disana": "di",
  "disitu": "di",
  "tidak ada": "tidak",
  "tidak tersedia": "tidak",
  "tidak bisa": "tidak",
};

const WORD_TO_GLOSS: Record<string, string> = {
  halo: "halo",
  hai: "halo",
  hi: "halo",
  hello: "halo",
  selamat: "halo",
  salam: "halo",
  tanya: "tanya",
  bertanya: "tanya",
  apakah: "tanya",
  ya: "ya",
  iya: "ya",
  oke: "ya",
  ok: "ya",
  betul: "ya",
  benar: "ya",
  tidak: "tidak",
  bukan: "tidak",
  enggak: "tidak",
  nggak: "tidak",
  gak: "tidak",
  tolong: "tolong",
  bantu: "tolong",
  tolonglah: "tolong",
  membantu: "tolong",
  mohon: "tolong",
  nama: "nama",
  namanya: "nama",
  saya: "saya",
  aku: "saya",
  cari: "cari",
  mencari: "cari",
  carikan: "cari",
  temukan: "cari",
  mana: "mana",
  kemana: "mana",
  sini: "di",
  sana: "di",
  situ: "di",
  buka: "buka",
  terbuka: "buka",
  dibuka: "buka",
  tutup: "tutup",
  tertutup: "tutup",
  ditutup: "tutup",
  mulai: "mulai",
  dimulai: "mulai",
  start: "mulai",
  berhenti: "berhenti",
  berhentilan: "berhenti",
  berhentikan: "berhenti",
  stop: "berhenti",
  lanjut: "lanjut",
  lanjutkan: "lanjut",
  terus: "lanjut",
  maju: "maju",
  kiri: "kiri",
  kirinya: "kiri",
  sebalahkiri: "kiri",
  kanan: "kanan",
  kanannya: "kanan",
  lurus: "lurus",
  belok: "belok",
  belokan: "belok",
  samping: "samping",
  sisi: "samping",
  kembali: "kembali",
  balik: "kembali",
  pulang: "kembali",
  masuk: "masuk",
  masuknya: "masuk",
  keluar: "keluar",
  keatas: "atas",
  naik: "naik",
  menaiki: "naik",
  naikkan: "naik",
  tangga: "tangga",
  ramp: "ramp",
  landai: "ramp",
  pintu: "pintu",
  jauh: "jauh",
  dekat: "dekat",
  besar: "besar",
  lebarnya: "besar",
  kecil: "kecil",
  banyak: "banyak",
  sedikit: "sedikit",
  awas: "awas",
  bahaya: "bahaya",
  berbahaya: "bahaya",
  jatuh: "jatuh",
  rambu: "rambu",
  tanda: "rambu",
  petunjuk: "rambu",
  ada: "ada",
  tersedia: "ada",
  tersedianya: "ada",
  punya: "ada",
  memiliki: "ada",
  info: "info",
  informasi: "info",
  verifikasi: "verifikasi",
  terverifikasi: "verifikasi",
  terverifikasinya: "verifikasi",
  lapor: "lapor",
  laporan: "lapor",
  laporkan: "lapor",
  melapor: "lapor",
  bagus: "bagus",
  sukses: "bagus",
  selesai: "bagus",
  baik: "bagus",
  jalan: "jalan",
  jalur: "jalan",
  berjalan: "jalan",
  peta: "peta",
  tempat: "tempat",
  gedung: "tempat",
  lokasi: "tempat",
  fasilitas: "tempat",
  fasilitasnya: "tempat",
  halte: "tempat",
  stasiun: "tempat",
  "terminal": "tempat",
};

const STOPWORDS = new Set<string>([
  "yang",
  "dan",
  "atau",
  "dengan",
  "untuk",
  "oleh",
  "pada",
  "ke",
  "dari",
  "di",
  "ini",
  "itu",
  "adalah",
  "ialah",
  "para",
  "agar",
  "karena",
  "seperti",
  "supaya",
  "secara",
  "antara",
  "terhadap",
  "sesuai",
  "sudah",
  "akan",
  "juga",
  "sangat",
  "sebuah",
  "seorang",
  "beberapa",
  "semua",
  "kapan",
  "mau",
  "ingin",
  "harus",
  "seharusnya",
  "bisa",
  "dapat",
  "perlu",
  "ketika",
  "saat",
  "apabila",
  "jika",
  "kalau",
  "maka",
  "tapi",
  "tetapi",
  "namun",
  "lebih",
  "paling",
  "sekitar",
  "karena",
  "dgn",
  "ttg",
  "yg",
  "nya",
  "pada",
]);

export function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stem(value: string): string {
  let t = value;
  for (const suf of ["lah", "kah", "nya", "pun", "ku", "mu"]) {
    if (t.length > suf.length && t.endsWith(suf)) {
      t = t.slice(0, -suf.length);
      break;
    }
  }
  for (let i = 0; i < 2; i++) {
    if (t.length > 3 && t.endsWith("kan")) {
      t = t.slice(0, -3);
      continue;
    }
    break;
  }
  if (t.length > 3 && t.endsWith("i")) t = t.slice(0, -1);
  return t;
}

export function wordToGloss(token: string): string | null {
  const clean = normalizeToken(token);
  if (!clean) return null;
  const direct = WORD_TO_GLOSS[clean];
  if (direct) return direct;
  const stemmed = WORD_TO_GLOSS[stem(clean)];
  if (stemmed) return stemmed;
  return null;
}

export function phraseToGloss(words: string[]): string | null {
  const key = words.join(" ");
  if (PHRASE_TO_GLOSS[key]) return PHRASE_TO_GLOSS[key];
  return PHRASE_TO_GLOSS[key.replace(/\s+/g, "")] ?? null;
}

export function isStopword(token: string): boolean {
  return STOPWORDS.has(normalizeToken(token));
}

export { WORD_TO_GLOSS, PHRASE_TO_GLOSS };