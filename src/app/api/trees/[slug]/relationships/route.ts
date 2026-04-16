import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { relationshipPayloadSchema } from "@/lib/shared/schemas";
import { formatPersonName } from "@/lib/shared/utils";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import {
  canEditRelationships,
  needsStructuralModeration,
} from "@/lib/server/permissions";
import { jsonError, parseJson, resolveTreeAccessFromRequest } from "@/lib/server/request";
import {
  relationshipStatusForSubmission,
  relationshipSummary,
} from "@/lib/server/tree-service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function duplicateRelationshipFilters(
  fromPersonId: string,
  toPersonId: string,
  type: string,
) {
  const filters: Array<Record<string, string>> = [
    { fromPersonId, toPersonId, type },
  ];

  if (type === "SPOUSE" || type === "SIBLING") {
    filters.push({
      fromPersonId: toPersonId,
      toPersonId: fromPersonId,
      type,
    });
  }

  if (type === "PARENT") {
    filters.push({
      fromPersonId: toPersonId,
      toPersonId: fromPersonId,
      type: "CHILD",
    });
  }

  if (type === "CHILD") {
    filters.push({
      fromPersonId: toPersonId,
      toPersonId: fromPersonId,
      type: "PARENT",
    });
  }

  return filters;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = await parseJson(request, relationshipPayloadSchema);

  if (!parsed.success) {
    return jsonError("Invalid relationship payload.", 422, parsed.error.flatten());
  }

  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access || !canEditRelationships(access.role)) {
    return jsonError("This link cannot edit relationships.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const body = parsed.data;
  if (body.fromPersonId === body.toPersonId) {
    return jsonError("A relationship must connect two different people.", 422);
  }

  const [fromPerson, toPerson] = await Promise.all([
    prisma.person.findFirst({
      where: {
        id: body.fromPersonId,
        treeId: access.tree.id,
        deletedAt: null,
      },
    }),
    prisma.person.findFirst({
      where: {
        id: body.toPersonId,
        treeId: access.tree.id,
        deletedAt: null,
      },
    }),
  ]);

  if (!fromPerson || !toPerson) {
    return jsonError("Both people must exist before they can be connected.", 404);
  }

  const existingRelationship = await prisma.relationship.findFirst({
    where: {
      treeId: access.tree.id,
      deletedAt: null,
      status: {
        in: ["ACTIVE", "PENDING"],
      },
      OR: duplicateRelationshipFilters(body.fromPersonId, body.toPersonId, body.type),
    },
  });

  if (existingRelationship) {
    return jsonError("That relationship already exists in this tree.", 409);
  }

  const status = relationshipStatusForSubmission(
    needsStructuralModeration(access.tree.moderationMode, access.role),
  );

  const relationship = await prisma.$transaction(async (tx) => {
    const created = await tx.relationship.create({
      data: {
        treeId: access.tree.id,
        fromPersonId: body.fromPersonId,
        toPersonId: body.toPersonId,
        type: body.type,
        note: body.note ?? null,
        proposedByEditorId: access.editorIdentity?.id ?? null,
        status,
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.RELATIONSHIP,
      entityId: created.id,
      action: EditAction.CREATE,
      accessRole: access.role!,
      summary:
        status === "PENDING"
          ? `Proposed a structural edit: ${relationshipSummary(
              body.type,
              formatPersonName(fromPerson),
              formatPersonName(toPerson),
            )}`
          : relationshipSummary(
              body.type,
              formatPersonName(fromPerson),
              formatPersonName(toPerson),
            ),
      after: {
        id: created.id,
        fromPersonId: created.fromPersonId,
        toPersonId: created.toPersonId,
        type: created.type,
        status: created.status,
        note: created.note,
      },
    });

    return created;
  });

  return NextResponse.json({ relationship });
}
