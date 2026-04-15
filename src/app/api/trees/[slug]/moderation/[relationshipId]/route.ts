import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { moderationDecisionSchema } from "@/lib/shared/schemas";
import { resolveTreeAccess } from "@/lib/server/access";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { canModerate } from "@/lib/server/permissions";
import { jsonError, parseJson, readRequestTokens } from "@/lib/server/request";

type RouteContext = {
  params: Promise<{ slug: string; relationshipId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug, relationshipId } = await context.params;
  const parsed = await parseJson(request, moderationDecisionSchema);

  if (!parsed.success) {
    return jsonError("Invalid moderation decision.", 422, parsed.error.flatten());
  }

  const tokens = readRequestTokens(request);
  const access = await resolveTreeAccess({
    slug,
    token: tokens.token,
    personalToken: tokens.personalToken,
    browserToken: tokens.browserToken,
  });

  if (!access || !canModerate(access.role)) {
    return jsonError("Only owner links can moderate structural edits.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const relationship = await prisma.relationship.findFirst({
    where: {
      id: relationshipId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!relationship || relationship.status !== "PENDING") {
    return jsonError("That pending structural edit could not be found.", 404);
  }

  const decision = parsed.data.decision;
  const nextStatus = decision === "approve" ? "ACTIVE" : "REJECTED";

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.relationship.update({
      where: { id: relationshipId },
      data: {
        status: nextStatus,
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.RELATIONSHIP,
      entityId: relationshipId,
      action: decision === "approve" ? EditAction.APPROVE : EditAction.REJECT,
      accessRole: access.role!,
      summary:
        decision === "approve"
          ? "Approved a pending structural edit."
          : "Rejected a pending structural edit.",
      before: {
        status: relationship.status,
      },
      after: {
        status: record.status,
      },
    });

    return record;
  });

  return NextResponse.json({ relationship: updated });
}
