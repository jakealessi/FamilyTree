import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/db";
import {
  SESSION_COOKIE,
  buildClearSessionCookieHeader,
  hashSessionCookieValue,
} from "@/lib/server/session";

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

export async function POST(request: Request) {
  const raw = getCookieFromRequest(request, SESSION_COOKIE);
  if (raw) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionCookieValue(raw) },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildClearSessionCookieHeader());
  return response;
}
