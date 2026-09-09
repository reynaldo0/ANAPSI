import { ApiError, handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-session";
import { ACCESSIBILITY_PROFILES } from "@/lib/constants";
import { requireDatabase } from "@/lib/db";
import type { AccessibilityProfileType } from "@/types";

function isAccessibilityProfileType(
  value: string,
): value is AccessibilityProfileType {
  return ACCESSIBILITY_PROFILES.some((profile) => profile.value === value);
}

interface AccessibilityUpdateBody {
  type?: unknown;
}

export async function GET() {
  try {
    const session = await requireAuth();
    const db = requireDatabase();

    const profile = await db.accessibilityProfile.findUnique({
      where: { userId: session.id },
      select: { type: true },
    });

    return ok({ type: profile?.type ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();

    let body: AccessibilityUpdateBody;
    try {
      body = (await request.json()) as AccessibilityUpdateBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    const type = typeof body.type === "string" ? body.type : "";
    if (!isAccessibilityProfileType(type)) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Pilih profil aksesibilitas yang tersedia.",
        { type },
      );
    }

    const db = requireDatabase();
    const dbProfile = await db.accessibilityProfile.upsert({
      where: { userId: session.id },
      create: { userId: session.id, type },
      update: { type },
      select: { type: true },
    });

    return ok({ type: dbProfile.type });
  } catch (error) {
    return handleApiError(error);
  }
}