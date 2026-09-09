import { cookies } from "next/headers";
import { unauthorized } from "@/lib/api/errors";
import {
  SESSION_COOKIE,
  sessionPayloadToUser,
  verifySessionToken,
} from "@/lib/auth/session";
import type { PublicUser } from "@/types";

/** Wajib login; melempar 401 jika sesi tidak valid/kedaluwarsa. Hanya untuk route handler. */
export async function requireAuth(): Promise<PublicUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) throw unauthorized();

  const payload = verifySessionToken(token);
  if (!payload) throw unauthorized();

  return sessionPayloadToUser(payload);
}