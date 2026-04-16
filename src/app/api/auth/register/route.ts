import { NextResponse } from "next/server";

import { registerSchema } from "@/lib/shared/schemas";
import { hashPassword } from "@/lib/server/password";
import { prisma } from "@/lib/server/db";
import { jsonError, parseJson } from "@/lib/server/request";
import {
  authRateLimitConfig,
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/server/rate-limit";
import { buildSessionCookieHeader, createSession } from "@/lib/server/session";

export async function POST(request: Request) {
  const { max, windowMs } = authRateLimitConfig();
  const ip = getClientIp(request);
  const limited = checkRateLimit(`register:${ip}`, max, windowMs);
  if (!limited.allowed) {
    return rateLimitedResponse(limited.retryAfterSec);
  }

  const parsed = await parseJson(request, registerSchema);

  if (!parsed.success) {
    return jsonError("Check your email and password.", 422, parsed.error.flatten());
  }

  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (existing) {
    return jsonError("An account with that email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  const rawSession = await createSession(user.id);
  const response = NextResponse.json({ user });
  response.headers.append("Set-Cookie", buildSessionCookieHeader(rawSession));
  return response;
}
