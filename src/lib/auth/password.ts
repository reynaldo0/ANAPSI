import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/**
 * Hash password scrypt dengan salt acak per-user (tanpa dependency eksternal).
 * Format tersimpan: `<salt hex>:<derived hex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const storedHash = Buffer.from(hashHex, "hex");
  const candidate = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  if (storedHash.length !== candidate.length) return false;
  return timingSafeEqual(storedHash, candidate);
}