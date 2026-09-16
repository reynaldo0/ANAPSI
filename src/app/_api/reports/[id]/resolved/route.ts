import type { NextRequest } from "next/server";
import { handleReportVerification } from "../handler";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleReportVerification(request, context, "RESOLVED");
}