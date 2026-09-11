import { ApiError, handleApiError } from "@/lib/api/errors";
import {
  checkRateLimit,
  clientIp,
  rateLimitKey,
} from "@/lib/api/rate-limit";
import { created } from "@/lib/api/response";
import {
  asString,
  buildErrors,
  hasErrors,
  isEmail,
  minLength,
  required,
} from "@/lib/api/validate";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";
import { registerUser } from "@/lib/users";

interface RegisterBody {
  displayName?: unknown;
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(rateLimitKey(clientIp(request), "register"), 5, 60_000);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.");
    }

    let body: RegisterBody;
    try {
      body = (await request.json()) as RegisterBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    const displayName = asString(body.displayName);
    const email = asString(body.email);
    const password = asString(body.password);

    const errors = buildErrors([
      {
        field: "displayName",
        ok: required(displayName) && displayName.length >= 2 && displayName.length <= 50,
        message: "Nama wajib diisi (2–50 karakter).",
      },
      {
        field: "email",
        ok: isEmail(email) && email.length <= 254,
        message: "Format email tidak valid.",
      },
      {
        field: "password",
        ok: minLength(password, 8) && password.length <= 128,
        message: "Kata sandi minimal 8 dan maksimal 128 karakter.",
      },
    ]);
    if (hasErrors(errors)) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Periksa kembali isian form.",
        errors,
      );
    }

    const passwordHash = await hashPassword(password);
    const publicUser = await registerUser({ email, displayName, passwordHash });

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

    const response = created(publicUser);
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}