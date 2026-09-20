import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware MINIMAL — hanya proteksi /admin.
 * /profile TIDAK diproteksi — bisa dibuka siapa saja tanpa login.
 * Auth state dikelola AuthContext di sisi klien.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya /admin yang butuh proteksi di server side
  if (pathname.startsWith("/admin")) {
    const cookie = request.cookies.get("anapsi_session");
    if (!cookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Hanya jalankan untuk /admin — TIDAK untuk /profile, /saved, dll
  matcher: ["/admin/:path*"],
};
