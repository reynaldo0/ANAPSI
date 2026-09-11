import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { storagePath } from "@/lib/file-storage";

/**
 * Kunci penandatangan sesi HMAC.
 * Prioritas: env AUTH_SECRET -> file `./.data/auth-secret` (dibuat otomatis).
 * Cara ini membuat sesi login tetap valid antar restart di mode demo,
 * sekaligus aman (tidak ada sekret hardcoded di repositori).
 */
let cached: string | null = null;

export function getAuthSecret(): string {
  if (cached) return cached;

  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cached = fromEnv;
    return cached;
  }

  const file = storagePath("auth-secret");
  if (existsSync(file)) {
    const existing = readFileSync(file, "utf8").trim();
    if (existing.length >= 16) {
      cached = existing;
      return cached;
    }
  }

  const fresh = randomBytes(32).toString("hex");
  writeFileSync(file, fresh, "utf8");
  cached = fresh;
  return cached;
}