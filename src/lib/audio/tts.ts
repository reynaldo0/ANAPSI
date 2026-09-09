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

export function createUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = getSpeechSynthesis()?.getVoices() ?? [];
  utterance.voice = pickIndonesianVoice(voices) ?? null;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  return utterance;
}
