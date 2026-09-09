import { handleApiError, notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getPlaceById } from "@/lib/data/places";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { data: place, source } = await getPlaceById(id);
    if (!place) throw notFound("Tempat tidak ditemukan.");
    return ok({ place, source });
  } catch (error) {
    return handleApiError(error);
  }
}