import { handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";

export async function POST() {
  try {
    const response = ok({ loggedOut: true } as const);
    response.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}