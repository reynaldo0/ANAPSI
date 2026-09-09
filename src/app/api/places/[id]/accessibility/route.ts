import type { NextRequest } from "next/server";
import { handleApiError, validationError, notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { demoPlaces } from "@/lib/data/demo-data";
import { placeEvaluation } from "@/lib/data/places-core";
import { getPlaceById } from "@/lib/data/places";
import { evaluateAccessibility } from "@/lib/scoring";
import type { AccessibilityProfileType } from "@/types";

const PROFILES: AccessibilityProfileType[] = ["VISUAL_NAVIGATION", "WHEELCHAIR_MOBILITY"];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const rawProfile = url.searchParams.get("profile");

    if (!PROFILES.includes(rawProfile as AccessibilityProfileType)) {
      return handleApiError(validationError({ profile: "Pilih profil visual atau kursi roda." }));
    }
    const profile = rawProfile as AccessibilityProfileType;

    const demoPlace = demoPlaces.find((p) => p.id === id);
    if (demoPlace) {
      return ok({
        placeId: id,
        profile,
        evaluation: placeEvaluation(demoPlace, profile),
        source: "demo",
      });
    }

    const detail = await getPlaceById(id);
    if (!detail.data) {
      return handleApiError(notFound("Tempat tidak ditemukan."));
    }

    const entrances = detail.data.entrances.map((e) => ({
      name: e.name,
      steps: e.steps,
      hasRamp: e.hasRamp,
      widthCm: e.widthCm,
    }));
    const features = detail.data.entrances.map((e) => ({
      kind: "accessible_entrance" as const,
      status: e.recommended ? "accessible" : e.steps <= 2 ? "partially_accessible" : "not_accessible",
      verification: "UNKNOWN" as const,
    }));
    const evaluation = evaluateAccessibility({
      profile,
      entrances,
      features,
      freshness: detail.data.freshness,
    });

    return ok({ placeId: id, profile, evaluation, source: detail.source });
  } catch (error) {
    return handleApiError(error);
  }
}