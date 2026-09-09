import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-session";
import { assertKnownPlaceId, isSaved, listSavedFor, removeSaved, toggleSaved } from "@/lib/data/saved";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const url = new URL(request.url);
    const placeId = url.searchParams.get("placeId");

    if (placeId) {
      assertKnownPlaceId(placeId);
      const saved = await isSaved(session.id, placeId);
      return ok({ saved, placeId });
    }

    const { data, source } = await listSavedFor(session.id);
    return ok({ saved: data, source });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    let body: { placeId?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }
    if (typeof body.placeId !== "string" || body.placeId.length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "ID tempat tidak valid.");
    }
    assertKnownPlaceId(body.placeId);
    const { data, saved, source } = await toggleSaved(session.id, body.placeId);
    return ok({ saved, place: data, placeId: body.placeId, source });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const url = new URL(request.url);
    const placeId = url.searchParams.get("placeId");
    if (typeof placeId !== "string" || placeId.length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "ID tempat tidak valid.");
    }
    assertKnownPlaceId(placeId);
    const { saved, source } = await removeSaved(session.id, placeId);
    return ok({ saved, placeId, source });
  } catch (error) {
    return handleApiError(error);
  }
}