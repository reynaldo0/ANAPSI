import { Prisma } from "@prisma/client";
import { ApiError, handleApiError } from "@/lib/api/errors";
import {
  checkRateLimit,
  clientIp,
  rateLimitKey,
} from "@/lib/api/rate-limit";
import { created, fail } from "@/lib/api/response";
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
import { requireDatabase } from "@/lib/db";

interface RegisterBody {
  displayName?: unknown;
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(rateLimitKey(clientIp(request), "register"), 5, 60_000);
    if (!limit.allowed) {
      return fail("Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED", 429);
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
        ok: required(displayName) && displayName.length >= 2,
        message: "Nama minimal 2 karakter.",
      },
      { field: "email", ok: isEmail(email), message: "Format email tidak valid." },
      {
        field: "password",
        ok: minLength(password, 8),
        message: "Kata sandi minimal 8 karakter.",
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

    const db = requireDatabase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(
        409,
        "EMAIL_TAKEN",
        "Email sudah terdaftar. Coba masuk atau gunakan email lain.",
      );
    }

    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await db.user.create({
        data: { email, displayName, passwordHash },
        select: { id: true, email: true, displayName: true, role: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ApiError(
          409,
          "EMAIL_TAKEN",
          "Email sudah terdaftar. Coba masuk atau gunakan email lain.",
        );
      }
      throw error;
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

    const response = created(publicUser);
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}