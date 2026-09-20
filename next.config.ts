import type { NextConfig } from "next";

// In production the /api rewrite points at the Go backend. Set INTERNAL_API_URL
// to the backend's address inside the deployment (e.g. http://backend:8080);
// the local default keeps `next dev`/`next start` working with a local server.
function apiTarget(): string {
  return process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8080";
}

// `output: standalone` is for self-hosting (Docker/VPS). Vercel skips it:
// Vercel has its own packaging, and standalone tracing breaks Vercel builds.
const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  output: isVercel ? undefined : "standalone",
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  rewrites() {
    return [
      {
        // /api/auth/* ditangani oleh Next.js Route Handlers (src/app/api/auth/*)
        // agar Set-Cookie header dari backend diteruskan dengan benar ke browser.
        // Semua route API lainnya tetap di-proxy langsung ke Go backend.
        source: "/api/:path((?!auth/).*)",
        destination: `${apiTarget()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;