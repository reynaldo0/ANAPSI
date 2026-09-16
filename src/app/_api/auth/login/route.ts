import { ApiError, handleApiError } from "@/lib/api/errors";
import {
  checkRateLimit,
  clientIp,
  rateLimitKey,
} from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
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
import { findLoginUser } from "@/lib/users";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(rateLimitKey(clientIp(request), "login"), 5, 60_000);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.");
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

    const found = await findLoginUser(email);
    const valid = found !== null && (await verifyPassword(password, found.passwordHash));
    if (!found || !valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah.");
    }
    const publicUser = found.user;

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