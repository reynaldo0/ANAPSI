import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/constants";

export interface MediaValidationResult {
  ok: boolean;
  error?: string;
}

const DATA_URL_RE = /^data:(image\/[\w+.+-]+);base64,([A-Za-z0-9+/=]+)$/;

export function validatePhotoDataUrl(url: string): MediaValidationResult {
  if (url.length > (MAX_PHOTO_BYTES * 4) / 3 + 64) {
    return { ok: false, error: "File terlalu besar. Maksimal 5 MB." };
  }
  const match = DATA_URL_RE.exec(url);
  if (!match) {
    return { ok: false, error: "Format file tidak dikenali." };
  }
  const mime = match[1];
  if (!ALLOWED_PHOTO_TYPES.some((allowed) => allowed === mime)) {
    return { ok: false, error: "Jenis file tidak didukung. Gunakan PNG, JPG, atau WebP." };
  }
  try {
    const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
    const byteLength = (match[2].length * 3) / 4 - padding;
    if (byteLength > MAX_PHOTO_BYTES) {
      return { ok: false, error: "File terlalu besar. Maksimal 5 MB." };
    }
  } catch {
    return { ok: false, error: "Data gambar rusak atau tidak valid." };
  }
  return { ok: true };
}