export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

export function pickIndonesianVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "id-id") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("id")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
  );
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
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  return utterance;
}
