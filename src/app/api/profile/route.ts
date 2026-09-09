import { ApiError, handleApiError, unauthorized } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { asString, buildErrors, hasErrors, required } from "@/lib/api/validate";
import { requireAuth } from "@/lib/auth/require-session";
import { requireDatabase } from "@/lib/db";

interface ProfileUpdateBody {
  displayName?: unknown;
}

function toProfileData(
  user: { id: string; email: string; displayName: string; accessibility: string | null },
) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    accessibility: user.accessibility,
  };
}

export async function GET() {
  try {
    const session = await requireAuth();
    const db = requireDatabase();

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        accessibilityProfile: { select: { type: true } },
      },
    });
    if (!user) throw unauthorized();

    return ok(
      toProfileData({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        accessibility: user.accessibilityProfile?.type ?? null,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();

    let body: ProfileUpdateBody;
    try {
      body = (await request.json()) as ProfileUpdateBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    const displayName = asString(body.displayName);
    const errors = buildErrors([
      {
        field: "displayName",
        ok: required(displayName) && displayName.length >= 2,
        message: "Nama minimal 2 karakter.",
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
    const user = await db.user.update({
      where: { id: session.id },
      data: { displayName },
      select: {
        id: true,
        email: true,
        displayName: true,
        accessibilityProfile: { select: { type: true } },
      },
    });

    return ok(
      toProfileData({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        accessibility: user.accessibilityProfile?.type ?? null,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}