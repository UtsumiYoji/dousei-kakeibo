import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, status = 400): NextResponse<{ error: string }> {
  const message = error instanceof Error ? error.message : "処理に失敗しました。";
  return NextResponse.json({ error: message }, { status });
}
