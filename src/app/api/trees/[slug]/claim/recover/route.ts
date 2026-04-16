import { NextResponse } from "next/server";

import { claimRecoverySchema } from "@/lib/shared/schemas";
import { resolveTreeAccess } from "@/lib/server/access";
import { prisma } from "@/lib/server/db";
import { jsonError, parseJson } from "@/lib/server/request";
import {
  buildPersonalLink,
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
  const parsed = await parseJson(request, claimRecoverySchema);

  if (!parsed.success) {
    return jsonError("Invalid claim recovery payload.", 422, parsed.error.flatten());
  }

  const access = await resolveTreeAccess({ slug });
  if (!access) {
    return jsonError("Tree not found.", 404);
  }

  if (access.isArchived) {
    return jsonError(
      "Archived trees must be reactivated with the owner link before personal recovery can continue.",
      409,
    );
  }

  const recovery = await prisma.claimRecovery.findFirst({
    where: {
      treeId: access.tree.id,
      recoveryCodeHash: hashToken(normalizeRecoveryCode(parsed.data.recoveryCode)),
    },
    include: {
      person: true,
    },
  });

  if (!recovery) {
    return jsonError("That recovery code was not recognized.", 404);
  }

  if (recovery.person.deletedAt) {
    return jsonError("That recovery code belongs to a profile that is no longer active.", 409);
  }

  const personalToken = generateOpaqueToken("personal");
  await prisma.$transaction(async (tx) => {
    let editorIdentityId = recovery.editorIdentityId;

    if (parsed.data.browserToken) {
      const browserTokenHash = hashToken(parsed.data.browserToken);
      const currentClaimOwner = await tx.editorIdentity.findFirst({
        where: {
          treeId: access.tree.id,
          claimedPersonId: recovery.personId,
        },
      });

      if (currentClaimOwner && currentClaimOwner.browserTokenHash !== browserTokenHash) {
        await tx.editorIdentity.update({
          where: { id: currentClaimOwner.id },
          data: {
            claimedPersonId: null,
          },
        });
      }

      const identity = await tx.editorIdentity.upsert({
        where: {
          treeId_browserTokenHash: {
            treeId: access.tree.id,
            browserTokenHash,
          },
        },
        create: {
          treeId: access.tree.id,
          browserTokenHash,
          displayName: parsed.data.displayName ?? null,
          accentColor: accentColorFromToken(parsed.data.browserToken),
          claimedPersonId: recovery.personId,
        },
        update: {
          displayName: parsed.data.displayName ?? undefined,
          claimedPersonId: recovery.personId,
          lastSeenAt: new Date(),
        },
      });

      editorIdentityId = identity.id;
    }

    await tx.claimRecovery.deleteMany({
      where: {
        treeId: access.tree.id,
        OR: [
          { personId: recovery.personId },
          ...(editorIdentityId ? [{ editorIdentityId }] : []),
        ],
      },
    });

    await tx.claimRecovery.create({
      data: {
        treeId: access.tree.id,
        personId: recovery.personId,
        editorIdentityId,
        recoveryCodeHash: hashToken(normalizeRecoveryCode(parsed.data.recoveryCode)),
        personalLinkTokenHash: hashToken(personalToken),
        lastUsedAt: new Date(),
      },
    });
  });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    personId: recovery.personId,
    personalLink: buildPersonalLink(origin, access.tree.slug, personalToken),
  });
}
