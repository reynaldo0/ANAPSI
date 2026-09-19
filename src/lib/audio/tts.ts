export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

// Marker nama suara pria Indonesia (Edge/Chrome natural voices).
const ID_MALE_NAMES = [
  "andika", "ardi", "indra", "dimas", "fajar", "bagus", "budi", "rangga",
  "reza", "bara", "doni", "yoga", "satya",
];

// Prioritaskan suara yang TEGAS & JELAS untuk dibacakan (biasanya suara pria,
// kualitas "Natural" di Edge, atau Google di Chrome). Skor tertinggi dipakai.
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;

  if (lang.startsWith("id")) score += 1000;
  else if (lang.startsWith("en")) score += 200;

  // Kualitas Natural (Edge) jauh lebih jelas untuk TTS.
  if (name.includes("natural") || name.includes("online")) score += 180;

  if (ID_MALE_NAMES.some((m) => name.includes(m))) score += 450; // pria Indonesia
  if (/male|pria|bapak/i.test(name)) score += 120;
  if (/female|wanita|perempuan|gadis|gadis/i.test(name)) score -= 120;

  if (/google/i.test(name)) score += 60; // Google: stabil, intonasi natural

  if (/daniel|david|christopher|brian|guy|george|thomas|marks/i.test(name)) score += 40;

  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  return best;
}

export function pickIndonesianVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return pickBestVoice(voices);
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesInitialized = false;

function refreshVoiceList(): SpeechSynthesisVoice[] {
  const synth = getSpeechSynthesis();
  const list = synth?.getVoices?.() ?? [];
  if (list.length > 0) cachedVoices = list;
  return cachedVoices;
}

function ensureVoiceList(): void {
  if (voicesInitialized || typeof window === "undefined") return;
  voicesInitialized = true;
  const synth = getSpeechSynthesis();
  if (!synth) return;
  // Browser speechSynthesis sometimes only populates voices after a
  // "voiceschanged" event, so subscribe once and cache the list.
  if (typeof (synth as SpeechSynthesis & { addEventListener?: unknown }).addEventListener === "function") {
    (synth as SpeechSynthesis & {
      addEventListener?: (type: string, listener: () => void) => void;
    }).addEventListener?.("voiceschanged", refreshVoiceList);
  }
  refreshVoiceList();
}

export function currentVoices(): SpeechSynthesisVoice[] {
  ensureVoiceList();
  return cachedVoices;
}

export function createUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = pickIndonesianVoice(currentVoices()) ?? null;
  // Sedikit lebih pelan & rendah agar tegas, jelas, enak didengar (bukan cempreng).
  utterance.rate = 0.95;
  utterance.pitch = 0.92;
  utterance.volume = 1;
  return utterance;
}