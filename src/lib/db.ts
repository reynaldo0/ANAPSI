import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ApiError } from "@/lib/api/errors";

const globalForPrisma = globalThis as unknown as { blindspotPrisma?: PrismaClient | null };

/**
 * Lazy singleton Prisma client untuk runtime aplikasi.
 * Mengembalikan null jika DATABASE_URL belum dikonfigurasi — pemanggil wajib
 * memakai data MOCK berlabel jelas (RULE 1) dan tidak boleh gagal diam-diam.
 */
export function getDb(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;

  if (globalForPrisma.blindspotPrisma === undefined) {
    const adapter = new PrismaPg(process.env.DATABASE_URL);
    globalForPrisma.blindspotPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.blindspotPrisma ?? null;
}

/**
 * Wajib memakai database nyata; jika belum dikonfigurasi, mengirimkan error
 * 503 yang jujur (bukan berhasil berpura-pura, RULE 1/6/8).
 */
export function requireDatabase(): PrismaClient {
  const db = getDb();
  if (!db) {
    throw new ApiError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "Database belum dikonfigurasi. Hubungi pengelola atau coba lagi nanti.",
    );
  }
  return db;
}
