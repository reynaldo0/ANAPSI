export type VoiceIntent =
  | { kind: "repeat" }
  | { kind: "stop_audio" }
  | { kind: "back" }
  | { kind: "search"; query: string }
  | { kind: "report" }
  | { kind: "menu"; target: "map" | "home" | "community" | "profile" }
  | { kind: "unknown" };

export interface ParsedCommand {
  raw: string;
  matched: boolean;
  intent: VoiceIntent;
}

export function normalizeCommand(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"]/g, "");
}

export function parseCommand(raw: string): ParsedCommand {
  const text = normalizeCommand(raw);
  const has = (phrase: string) => text.includes(phrase);

  if (has("ulang") || has("ulangi")) {
    return { raw, matched: true, intent: { kind: "repeat" } };
  }
  if (has("berhenti") || has("stop") || has("diam") || has("ok google hentikan")) {
    return { raw, matched: true, intent: { kind: "stop_audio" } };
  }
  if (has("kembali") || has("mundur")) {
    return { raw, matched: true, intent: { kind: "back" } };
  }
  if (has("cari")) {
    const query = text.replace(/cari\s*/, "").trim();
    return { raw, matched: true, intent: { kind: "search", query } };
  }
  if (has("lapor") || has("laporkan")) {
    return { raw, matched: true, intent: { kind: "report" } };
  }
  if (has("ke peta") || has("buka peta") || has("tampilkan peta")) {
    return { raw, matched: true, intent: { kind: "menu", target: "map" } };
  }
  if (has("ke komunitas") || has("buka komunitas")) {
    return { raw, matched: true, intent: { kind: "menu", target: "community" } };
  }
  if (has("ke profil") || has("buka profil")) {
    return { raw, matched: true, intent: { kind: "menu", target: "profile" } };
  }
  if (has("ke beranda") || has("buka beranda") || has("ke home")) {
    return { raw, matched: true, intent: { kind: "menu", target: "home" } };
  }
  return { raw, matched: false, intent: { kind: "unknown" } };
}

export const VOICE_COMMAND_HINTS = [
  "“Ulang” — ulangi audio terakhir",
  "“Berhenti” — hentikan audio",
  "“Kembali” — kembali ke halaman sebelumnya",
  "“Cari …” — langsung mencari tempat",
  "“Buka peta” — buka halaman peta",
] as const;
