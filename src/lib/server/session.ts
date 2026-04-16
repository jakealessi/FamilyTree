import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/server/db";
import { hashToken } from "@/lib/server/tokens";

export const SESSION_COOKIE = "ft_session";
const SESSION_DAYS = 60;

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

export function hashSessionCookieValue(value: string) {
  return hashToken(value);
}

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionCookieValue(raw);
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: sessionExpiry(),
    },
  });
  return raw;
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

export async function findUserIdBySessionCookie(rawCookie: string | undefined) {
  if (!rawCookie) {
    return null;
  }

  const tokenHash = hashSessionCookieValue(rawCookie);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return null;
  }

  return session.userId;
}

function sessionCookieSuffix(maxAge: number) {
  const parts = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function buildSessionCookieHeader(rawToken: string) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}; ${sessionCookieSuffix(maxAge)}`;
}

export function buildClearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; ${sessionCookieSuffix(0)}`;
}
