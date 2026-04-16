import { NextResponse } from "next/server";

import { loginSchema } from "@/lib/shared/schemas";
import { verifyPassword } from "@/lib/server/password";
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
  const limited = checkRateLimit(`login:${ip}`, max, windowMs);
  if (!limited.allowed) {
    return rateLimitedResponse(limited.retryAfterSec);
  }

  const parsed = await parseJson(request, loginSchema);

  if (!parsed.success) {
    return jsonError("Invalid login payload.", 422, parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return jsonError("Email or password was not recognized.", 401);
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return jsonError("Email or password was not recognized.", 401);
  }

  const rawSession = await createSession(user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
  response.headers.append("Set-Cookie", buildSessionCookieHeader(rawSession));
  return response;
}
