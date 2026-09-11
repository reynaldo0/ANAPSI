import { createHash } from "node:crypto";
import type { PublicUser } from "@/types";

/**
 * Identitas pelapor yang aman dari sisi server.
 * - Pengguna login --> `user:<id>` (tidak bisa dipalsukan via body).
 * - Anonim --> `anon:<sha256(ip)>`, terikat alamat IP pemanggil sehingga
 *   kunci pelapor lain tidak dapat diklaim/ditiru dari perangkat berbeda.
 */
export function reporterKey(ip: string | null, session?: PublicUser | null): string {
  if (session) return `user:${session.id}`;
  return `anon:${createHash("sha256").update(ip ?? "unknown").digest("hex")}`;
}