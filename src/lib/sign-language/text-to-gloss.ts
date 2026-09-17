import {
  GLOSS_BY_ID,
  FALLBACK_POSE,
  isStopword,
  phraseToGloss,
  wordToGloss,
  type SignPose,
} from "@/lib/sign-language/gloss-dictionary";

export interface SignPhrase {
  text: string;
  signs: string[];
}

const MAX_SIGNS_PER_PHRASE = 12;

function splitSentences(raw: string): string[] {
  return raw
    .replace(/\r/g, "")
    .split(/(?<=[.!?…])\s+|\n+|\.{3}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tokensOf(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .replace(/[”"'‘’`“«»„]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sentenceToSigns(sentence: string): string[] {
  const tokens = tokensOf(sentence);
  const signs: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      if (i + len > tokens.length) continue;
      const window = tokens.slice(i, i + len);
      const phrase = phraseToGloss(window);
      if (phrase) {
        pushUnique(signs, phrase);
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const token = tokens[i];
    if (!isStopword(token)) {
      const gloss = wordToGloss(token);
      if (gloss) pushUnique(signs, gloss);
      else pushUnique(signs, FALLBACK_POSE.id);
    }
    i++;
  }

  const trimmed = sentence.trim();
  if (signs.length > 0) {
    if (trimmed.endsWith("?") && signs[signs.length - 1] !== "tanya") signs.push("tanya");
    if (trimmed.endsWith("!") && signs[signs.length - 1] !== "seru") signs.push("seru");
  }

  return signs;
}

function pushUnique(signs: string[], id: string): void {
  if (signs.length === 0) {
    signs.push(id);
    return;
  }
  if (signs[signs.length - 1] !== id) signs.push(id);
}

export function textToSigns(text: string): string[] {
  const phrases = textToScript(text);
  return phrases.flatMap((p) => p.signs);
}

export function textToScript(text: string): SignPhrase[] {
  const result: SignPhrase[] = [];
  const sentences = splitSentences(text ?? "");
  const buffer: string[] = [];

  const flush = (): void => {
    if (buffer.length === 0) return;
    result.push({ text: buffer.join(" "), signs: buffer.flatMap(sentenceToSigns) });
    buffer.length = 0;
  };

  for (const sentence of sentences) {
    const signs = sentenceToSigns(sentence);
    if (signs.length === 0) continue;
    if (buffer.length >= 3) flush();
    buffer.push(sentence);
    if (signs.length >= MAX_SIGNS_PER_PHRASE) flush();
  }
  flush();

  return result;
}

export function resolvePoses(signIds: string[]): SignPose[] {
  return signIds.map((id) => GLOSS_BY_ID.get(id) ?? FALLBACK_POSE);
}