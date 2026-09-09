import { NextResponse } from "next/server";

export interface ApiErrorDetail {
  message: string;
  code: string;
  details?: unknown;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data } as const, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ ok: true, data } as const, { status: 201 });
}

export function fail(
  message: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse {
  const body: ApiErrorDetail = { message, code };
  if (details !== undefined) body.details = details;
  return NextResponse.json({ ok: false, error: body } as const, { status });
}