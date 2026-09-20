import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8080";

/**
 * Thin proxy untuk POST /api/auth/login.
 * Meneruskan request ke Go backend dan memastikan Set-Cookie header
 * diteruskan kembali ke browser (diperlukan agar cookie HttpOnly
 * tersimpan di domain Next.js, bukan domain backend langsung).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const upstream = await fetch(`${BACKEND}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await upstream.text();
    const response = new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });

    // Forward semua Set-Cookie dari backend ke browser
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append("Set-Cookie", value);
      }
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "PROXY_ERROR", message: "Tidak dapat terhubung ke server." } },
      { status: 502 },
    );
  }
}
