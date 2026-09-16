import { handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}