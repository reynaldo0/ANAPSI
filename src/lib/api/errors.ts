import type { NextResponse } from "next/server";
import { fail } from "@/lib/api/response";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function unauthorized(message = "Sesi berakhir. Silakan masuk kembali."): ApiError {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Kamu tidak memiliki izin untuk aksi ini."): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Data tidak ditemukan."): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function validationError(details: Record<string, string>): ApiError {
  return new ApiError(422, "VALIDATION_ERROR", "Periksa kembali isian form.", details);
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return fail(error.message, error.code, error.status, error.details);
  }
  console.error("[api] unhandled error:", error);
  return fail("Terjadi kesalahan server. Coba lagi beberapa saat.", "INTERNAL", 500);
}