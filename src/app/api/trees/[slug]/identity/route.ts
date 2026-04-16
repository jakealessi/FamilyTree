import { NextResponse } from "next/server";

import { resolveIdentitySchema } from "@/lib/shared/schemas";
import { prisma } from "@/lib/server/db";
import { canEditTree } from "@/lib/server/permissions";
import { jsonError, parseJson, readTreeAuth } from "@/lib/server/request";
import { resolveTreeAccess } from "@/lib/server/access";
import { accentColorFromToken, hashToken } from "@/lib/server/tokens";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = await parseJson(request, resolveIdentitySchema);

  if (!parsed.success) {
    return jsonError("Invalid editor identity payload.", 422, parsed.error.flatten());
  }

  const headerAuth = await readTreeAuth(request);
  const access = await resolveTreeAccess({
    slug,
    token: headerAuth.token,
    personalToken: headerAuth.personalToken,
    browserToken: headerAuth.browserToken ?? parsed.data.browserToken,
    userId: headerAuth.userId,
  });

  if (!access || (!canEditTree(access.role) && access.role !== "PERSONAL")) {
    return jsonError("This link does not allow editing.", 403);
  }

  const { browserToken, displayName } = parsed.data;
  const browserTokenHash = hashToken(browserToken);
  const shouldAssignClaim = access.role === "PERSONAL" && Boolean(access.claimedPersonId);

  if (shouldAssignClaim) {
    const currentClaimOwner = await prisma.editorIdentity.findFirst({
      where: {
        treeId: access.tree.id,
        claimedPersonId: access.claimedPersonId,
      },
    });

    if (currentClaimOwner && currentClaimOwner.browserTokenHash !== browserTokenHash) {
      await prisma.editorIdentity.update({
        where: { id: currentClaimOwner.id },
        data: {
          claimedPersonId: null,
        },
      });
    }
  }

  const identity = await prisma.editorIdentity.upsert({
    where: {
      treeId_browserTokenHash: {
        treeId: access.tree.id,
        browserTokenHash,
      },
    },
    create: {
      treeId: access.tree.id,
      browserTokenHash,
      displayName: displayName ?? null,
      accentColor: accentColorFromToken(browserToken),
      claimedPersonId: shouldAssignClaim ? access.claimedPersonId ?? null : null,
    },
    update: {
      displayName: displayName ?? undefined,
      lastSeenAt: new Date(),
      claimedPersonId: shouldAssignClaim ? access.claimedPersonId ?? null : undefined,
    },
  });

  return NextResponse.json({
    identity: {
      id: identity.id,
      displayName: identity.displayName,
      accentColor: identity.accentColor,
      claimedPersonId: identity.claimedPersonId,
    },
  });
}
