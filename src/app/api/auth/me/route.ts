import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8080";

export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(`${BACKEND}/api/auth/me`, {
      headers: {
        // Forward cookie dari browser ke backend
        Cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "PROXY_ERROR", message: "Tidak dapat terhubung ke server." } },
      { status: 502 },
    );
  }
}
