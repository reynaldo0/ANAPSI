import { createHmac, timingSafeEqual } from "node:crypto";
import type { PublicUser } from "@/types";

export const SESSION_COOKIE = "blindspot:session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
} as const;

export interface SessionPayload {
  sub: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  exp: number;
}

function getAuthSecretOrThrow(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET belum dikonfigurasi");
  }
  return secret;
}

function signCore(core: string, secret: string): string {
  return createHmac("sha256", secret).update(core).digest("base64url");
}

export function createSessionToken(user: PublicUser): string {
  const secret = getAuthSecretOrThrow();
  const tokenPayload: SessionPayload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const core = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  return `${core}.${signCore(core, secret)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;
    const [core, signature] = token.split(".");
    if (!core || !signature) return null;
    const expected = createHmac("sha256", secret).update(core).digest("base64url");
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(core, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionPayloadToUser(payload: SessionPayload): PublicUser {
  return {
    id: payload.sub,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
  };
}