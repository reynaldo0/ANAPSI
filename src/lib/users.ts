import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { readJsonFile, writeJsonFile } from "@/lib/file-storage";
import { hashPassword } from "@/lib/auth/password";
import type { PublicUser } from "@/types";

export type UserRole = "USER" | "ADMIN";

interface MockUserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

/**
 * Kredensial demo (hanya untuk mode tanpa database, ter-*seed* otomatis).
 * Jangan dipakai di produksi; gunakan DATABASE_URL + AUTH_SECRET nyata.
 */
export const DEMO_CREDENTIALS = {
  adminEmail: "admin@blindspot.id",
  adminPassword: "admin12345",
  userEmail: "demo@blindspot.id",
  userPassword: "demo12345",
} as const;

let users: MockUserRow[] | null = null;

async function persistUsers(): Promise<void> {
  if (users) writeJsonFile("users", users);
}

async function ensureUsers(): Promise<MockUserRow[]> {
  if (users) return users;

  const fromFile = readJsonFile<MockUserRow[]>("users", []);
  if (fromFile.length > 0) {
    users = fromFile;
    return users;
  }

  const [adminHash, userHash] = await Promise.all([
    hashPassword(DEMO_CREDENTIALS.adminPassword),
    hashPassword(DEMO_CREDENTIALS.userPassword),
  ]);
  const now = new Date().toISOString();
  users = [
    {
      id: "u-admin-demo",
      email: DEMO_CREDENTIALS.adminEmail,
      displayName: "Admin ANAPSI",
      passwordHash: adminHash,
      role: "ADMIN",
      createdAt: now,
    },
    {
      id: "u-demo-user",
      email: DEMO_CREDENTIALS.userEmail,
      displayName: "Pengguna Demo",
      passwordHash: userHash,
      role: "USER",
      createdAt: now,
    },
  ];
  await persistUsers();
  return users;
}

function publicUser(row: MockUserRow): PublicUser {
  return { id: row.id, email: row.email, displayName: row.displayName, role: row.role };
}

/**
 * Verifikasi kredensial untuk login. Mengembalikan hash kata sandi + data publik
 * bila pengguna ditemukan, atau null bila tidak (email ambigu dipertahankan).
 */
export async function findLoginUser(
  email: string,
): Promise<{ passwordHash: string; user: PublicUser } | null> {
  const normalized = email.trim().toLowerCase();

  const db = getDb();
  if (db) {
    const row = await db.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, displayName: true, role: true, passwordHash: true },
    });
    if (!row) return null;
    return {
      passwordHash: row.passwordHash,
      user: { id: row.id, email: row.email, displayName: row.displayName, role: row.role },
    };
  }

  const rows = await ensureUsers();
  const row = rows.find((r) => r.email.toLowerCase() === normalized);
  if (!row) return null;
  return { passwordHash: row.passwordHash, user: publicUser(row) };
}

/** Membaca pengguna berdasarkan id (untuk sesi pada mode demo). */
export async function findUserById(id: string): Promise<PublicUser | null> {
  const db = getDb();
  if (db) {
    const row = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, displayName: true, role: true },
    });
    return row ? { id: row.id, email: row.email, displayName: row.displayName, role: row.role } : null;
  }

  const rows = await ensureUsers();
  const row = rows.find((r) => r.id === id);
  return row ? publicUser(row) : null;
}

/** Membuat pengguna baru (register). Melempar 409 bila email sudah terdaftar. */
export async function registerUser(input: {
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<PublicUser> {
  const normalized = input.email.trim().toLowerCase();

  const db = getDb();
  if (db) {
    let row;
    try {
      row = await db.user.create({
        data: { email: normalized, displayName: input.displayName, passwordHash: input.passwordHash },
        select: { id: true, email: true, displayName: true, role: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "EMAIL_TAKEN", "Email sudah terdaftar. Coba masuk atau gunakan email lain.");
      }
      throw error;
    }
    return { id: row.id, email: row.email, displayName: row.displayName, role: row.role };
  }

  const rows = await ensureUsers();
  if (rows.some((r) => r.email.toLowerCase() === normalized)) {
    throw new ApiError(409, "EMAIL_TAKEN", "Email sudah terdaftar. Coba masuk atau gunakan email lain.");
  }

  const row: MockUserRow = {
    id: randomUUID(),
    email: normalized,
    displayName: input.displayName,
    passwordHash: input.passwordHash,
    role: "USER",
    createdAt: new Date().toISOString(),
  };
  rows.push(row);
  users = rows;
  await persistUsers();
  return publicUser(row);
}