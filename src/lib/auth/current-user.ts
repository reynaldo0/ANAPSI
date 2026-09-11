import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { findUserById } from "@/lib/users";
import type { PublicUser } from "@/types";

/**
 * Membaca pengguna yang sedang login dari cookie sesi HMAC.
 * Selalu memakai data pengguna terkini (pengguna yang dihapus otomatis
 * tidak login lagi), baik dari database nyata maupun store demo.
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const db = getDb();
  if (db) {
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

  const fresh = await findUserById(payload.sub);
  return fresh ?? null;
}