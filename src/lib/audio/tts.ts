export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

// Nama suara pria Indonesia (Edge/Chrome natural voices) yang jelas & tegas.
const ID_MALE_NAMES = [
  "andika", "ardi", "indra", "dimas", "fajar", "bagus", "budi", "rangga",
  "reza", "bara", "doni", "yoga", "satya",
];

// Nama suara pria sistem berbahasa Inggris yang artikulasinya jelas.
const EN_MALE_NAMES = [
  "daniel", "david", "christopher", "brian", "guy", "george", "thomas",
  "marks", "james", "john", "andrew", "alex", "eric", "fred", "mike", "mark",
];

const MALE_MARKERS = [/male/i, /pria/i, /bapak/i];

function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  if (ID_MALE_NAMES.some((m) => name.includes(m))) return true;
  if (EN_MALE_NAMES.some((m) => name.includes(m))) return true;
  return MALE_MARKERS.some((re) => re.test(name));
}

// Skor kualitas suara: bahasa Indonesia diutamakan, suara "Natural"/"Online"
// (Edge) jauh lebih jelas daripada bawaan sistem, dan pria diunggulkan jelas.
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;

  if (lang.startsWith("id")) score += 1000;
  else if (lang.startsWith("en")) score += 250;

  if (name.includes("natural") || name.includes("online")) score += 200;
  if (name.includes("google")) score += 80;

  if (isMaleVoice(voice)) score += 600;
  else if (/female|wanita|perempuan|cewek|gadis/i.test(name)) score -= 150;

  return score;
}

const VOICE_STORAGE_KEY = "anapsi:voice";

function readStoredVoice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeVoice(name: string): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, name);
  } catch {
    // ignore
  }
}

function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .map((v) => ({ voice: v, score: scoreVoice(v) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.voice);
}

// Pilih suara: utamakan PRIa yang jelas (id maupun en). Jika tidak ada suara
// pria sama sekali, pakai suara terbaik yang tersedia agar tetap berbunyi.
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ranked = rankVoices(voices);
  if (ranked.length === 0) return undefined;

  // Stabilitas suara: pertahankan pilihan yang sudah tersimpan bila masih ada.
  const stored = readStoredVoice();
  const storedIndex = stored ? ranked.findIndex((v) => v.name === stored) : -1;
  if (storedIndex >= 0) return ranked[storedIndex];

  const firstMale = ranked.findIndex((v) => isMaleVoice(v));
  return firstMale >= 0 ? ranked[firstMale] : ranked[0];
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let primed = false;

function refreshVoiceList(): SpeechSynthesisVoice[] {
  const synth = getSpeechSynthesis();
  const list = synth?.getVoices?.() ?? [];
  if (list.length > 0) cachedVoices = list;
  return cachedVoices;
}

function ensureVoiceList(): void {
  if (typeof window === "undefined") return;
  const synth = getSpeechSynthesis();
  if (!synth) return;
  // Browser speechSynthesis sometimes only populates voices after a
  // "voiceschanged" event, so subscribe once and cache the list.
  if (typeof (synth as SpeechSynthesis & { addEventListener?: unknown }).addEventListener === "function") {
    (synth as SpeechSynthesis & {
      addEventListener?: (type: string, listener: () => void) => void;
    }).addEventListener?.("voiceschanged", () => {
      refreshVoiceList();
      // Simpan pilihan terbaik begitu daftar suara tersedia, agar pemanggilan
      // pertama tidak jatuh ke suara bawaan yang jelek.
      const picked = pickBestVoice(cachedVoices);
      if (picked) storeVoice(picked.name);
    });
  }
  refreshVoiceList();
}

// Panas-panasi speechSynthesis saat provider dimuat. Di Chrome Android,
// pemanggilan speak() pertama sering tertunda lama; speak/cancel volume-0
// sekali membuat pemanggilan berikutnya langsung bunyi (tanpa delay).
export function primeSpeechSynthesis(): void {
  const synth = getSpeechSynthesis();
  if (!synth || primed) return;
  primed = true;
  ensureVoiceList();
  try {
    const warmUp = new SpeechSynthesisUtterance(" ");
    warmUp.volume = 0;
    synth.speak(warmUp);
    synth.cancel();
  } catch {
    // ignore
  }
}

export function currentVoices(): SpeechSynthesisVoice[] {
  ensureVoiceList();
  return cachedVoices;
}

export function createUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  let voices = currentVoices();
  if (voices.length === 0) voices = refreshVoiceList();
  const voice = pickBestVoice(voices) ?? null;
  utterance.voice = voice;
  if (voice) storeVoice(voice.name);
  // Tegas, jelas, tidak bertele-tele: sedikit lebih cepat dari standar,
  // nada cenderung rendah agar terdengar maskulin & tidak cempreng.
  utterance.rate = 1.0;
  utterance.pitch = 0.78;
  utterance.volume = 1;
  return utterance;
}