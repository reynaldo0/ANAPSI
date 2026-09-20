import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8080";

export async function POST(request: NextRequest) {
  try {
    const upstream = await fetch(`${BACKEND}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: request.headers.get("cookie") ?? "",
      },
    });

    const data = await upstream.text();
    const response = new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });

    // Clear cookie dari browser
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append("Set-Cookie", value);
      }
    });

    return response;
  } catch {
    // Logout tetap berhasil di sisi klien
    return NextResponse.json({ ok: true, data: { loggedOut: true } });
  }
}
