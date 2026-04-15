import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { claimProfileSchema } from "@/lib/shared/schemas";
import { formatPersonName } from "@/lib/shared/utils";
import { resolveTreeAccess } from "@/lib/server/access";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { canEditTree } from "@/lib/server/permissions";
import { jsonError, parseJson, readRequestTokens } from "@/lib/server/request";
import {
  buildPersonalLink,
  generateRecoveryCode,
  generateOpaqueToken,
  hashToken,
  normalizeRecoveryCode,
} from "@/lib/server/tokens";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function accentColorFromToken(token: string) {
  const digest = hashToken(token);
  return `#${digest.slice(0, 6)}`;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = await parseJson(request, claimProfileSchema);

  if (!parsed.success) {
    return jsonError("Invalid claim payload.", 422, parsed.error.flatten());
  }

  const tokens = readRequestTokens(request);
  const access = await resolveTreeAccess({
    slug,
    token: tokens.token,
    personalToken: tokens.personalToken,
  });

  if (!access || !canEditTree(access.role)) {
    return jsonError("Only owner or contributor links can claim a profile.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const body = parsed.data;
  const person = await prisma.person.findFirst({
    where: {
      id: body.personId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!person) {
    return jsonError("Profile not found.", 404);
  }

  const currentClaim = await prisma.editorIdentity.findFirst({
    where: {
      treeId: access.tree.id,
      claimedPersonId: person.id,
    },
  });

  const browserTokenHash = hashToken(body.browserToken);

  if (currentClaim && currentClaim.browserTokenHash !== browserTokenHash) {
    return jsonError("That profile has already been claimed from another device.", 409);
  }

  const recoveryCode = generateRecoveryCode();
  const personalToken = generateOpaqueToken("personal");
  const origin = new URL(request.url).origin;

  await prisma.$transaction(async (tx) => {
    const editorIdentity = await tx.editorIdentity.upsert({
      where: {
        treeId_browserTokenHash: {
          treeId: access.tree.id,
          browserTokenHash,
        },
      },
      create: {
        treeId: access.tree.id,
        browserTokenHash,
        displayName: body.displayName ?? null,
        accentColor: accentColorFromToken(body.browserToken),
        claimedPersonId: person.id,
      },
      update: {
        displayName: body.displayName ?? undefined,
        claimedPersonId: person.id,
        lastSeenAt: new Date(),
      },
    });

    await tx.claimRecovery.deleteMany({
      where: {
        treeId: access.tree.id,
        OR: [{ personId: person.id }, { editorIdentityId: editorIdentity.id }],
      },
    });

    await tx.claimRecovery.create({
      data: {
        treeId: access.tree.id,
        personId: person.id,
        editorIdentityId: editorIdentity.id,
        recoveryCodeHash: hashToken(normalizeRecoveryCode(recoveryCode)),
        personalLinkTokenHash: hashToken(personalToken),
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: editorIdentity.id,
      entityType: EditEntityType.CLAIM,
      entityId: person.id,
      action: EditAction.CLAIM,
      accessRole: access.role!,
      summary: `${formatPersonName(person)} was claimed for personal editing.`,
      after: {
        personId: person.id,
        editorIdentityId: editorIdentity.id,
      },
    });
  });

  return NextResponse.json({
    personId: person.id,
    recoveryCode,
    personalLink: buildPersonalLink(origin, access.tree.slug, personalToken),
  });
}
