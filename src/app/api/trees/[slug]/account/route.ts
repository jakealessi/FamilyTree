import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/db";
import { jsonError, readTreeAuth, resolveTreeAccessFromRequest } from "@/lib/server/request";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await readTreeAuth(request);

  if (!auth.userId) {
    return jsonError("Sign in to save this tree to your account.", 401);
  }

  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access || access.role !== "OWNER" || !access.isOwnerByBrowser) {
    return jsonError("Only the browser that created this tree can attach it to an account.", 403);
  }

  if (access.tree.ownerUserId) {
    if (access.tree.ownerUserId === auth.userId) {
      return NextResponse.json({ ok: true, alreadyLinked: true });
    }
    return jsonError("This tree is already linked to another account.", 409);
  }

  await prisma.familyTree.update({
    where: { id: access.tree.id },
    data: { ownerUserId: auth.userId },
  });

  return NextResponse.json({ ok: true });
}
