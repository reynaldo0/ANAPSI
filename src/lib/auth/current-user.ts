import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE,
  sessionPayloadToUser,
  verifySessionToken,
} from "@/lib/auth/session";
import type { PublicUser } from "@/types";

/**
 * Membaca pengguna yang sedang login dari cookie sesi HMAC.
 * Jika database nyata tersedia, selalu memakai data segar dari DB
 * (pengguna yang dihapus otomatis tidak login lagi).
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;
  const sessionUser: PublicUser = sessionPayloadToUser(payload);

  const db = getDb();
  if (!db) return sessionUser;

  const fresh = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, displayName: true, role: true },
  });
  if (!fresh) return null;

  return {
    id: fresh.id,
    email: fresh.email,
    displayName: fresh.displayName,
    role: fresh.role,
  };
}