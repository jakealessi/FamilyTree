import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveTreeAccess } from "@/lib/server/access";
import { SESSION_COOKIE, findUserIdBySessionCookie } from "@/lib/server/session";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  );
}

function getCookieFromRequest(request: Request, name: string) {
  const raw = request.headers.get("cookie");
  if (!raw) {
    return undefined;
  }

  const parts = raw.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    if (key !== name) {
      continue;
    }
    return decodeURIComponent(trimmed.slice(eq + 1));
  }

  return undefined;
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

export async function readTreeAuth(request: Request) {
  const tokens = readRequestTokens(request);
  const sessionCookie = getCookieFromRequest(request, SESSION_COOKIE);
  const userId = await findUserIdBySessionCookie(sessionCookie);
  return {
    ...tokens,
    userId,
  };
}

export async function resolveTreeAccessFromRequest(request: Request, slug: string) {
  const auth = await readTreeAuth(request);
  return resolveTreeAccess({
    slug,
    token: auth.token,
    personalToken: auth.personalToken,
    browserToken: auth.browserToken,
    userId: auth.userId,
  });
}

export async function parseJson<T extends z.ZodTypeAny>(request: Request, schema: T) {
  try {
    const json = (await request.json()) as unknown;
    return schema.safeParse(json);
  } catch {
    return schema.safeParse(undefined);
  }
}
