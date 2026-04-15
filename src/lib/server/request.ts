import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  );
}

export function readRequestTokens(request: Request) {
  const url = new URL(request.url);

  return {
    token: request.headers.get("x-tree-token") ?? url.searchParams.get("token"),
    personalToken:
      request.headers.get("x-personal-token") ?? url.searchParams.get("personal"),
    browserToken:
      request.headers.get("x-editor-token") ?? url.searchParams.get("editorToken"),
  };
}

export async function parseJson<T extends z.ZodTypeAny>(request: Request, schema: T) {
  try {
    const json = (await request.json()) as unknown;
    return schema.safeParse(json);
  } catch {
    return schema.safeParse(undefined);
  }
}
