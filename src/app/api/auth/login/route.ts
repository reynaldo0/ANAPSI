import { ApiError, handleApiError } from "@/lib/api/errors";
import {
  checkRateLimit,
  clientIp,
  rateLimitKey,
} from "@/lib/api/rate-limit";
import { fail, ok } from "@/lib/api/response";
import {
  asString,
  buildErrors,
  hasErrors,
  isEmail,
  required,
} from "@/lib/api/validate";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";
import { requireDatabase } from "@/lib/db";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(rateLimitKey(clientIp(request), "login"), 5, 60_000);
    if (!limit.allowed) {
      return fail("Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED", 429);
    }

    let body: LoginBody;
    try {
      body = (await request.json()) as LoginBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    const email = asString(body.email);
    const password = asString(body.password);
    const errors = buildErrors([
      { field: "email", ok: isEmail(email), message: "Format email tidak valid." },
      { field: "password", ok: required(password), message: "Kata sandi wajib diisi." },
    ]);
    if (hasErrors(errors)) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Periksa kembali isian form.",
        errors,
      );
    }

    const db = requireDatabase();
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, role: true, passwordHash: true },
    });

    const valid = user !== null && (await verifyPassword(password, user.passwordHash));
    if (!user || !valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah.");
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    let token: string;
    try {
      token = createSessionToken(publicUser);
    } catch {
      throw new ApiError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Konfigurasi server belum lengkap. Hubungi pengelola.",
      );
    }

    const response = ok(publicUser);
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}