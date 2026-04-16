import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { relationshipPayloadSchema } from "@/lib/shared/schemas";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import {
  canEditRelationships,
  needsStructuralModeration,
} from "@/lib/server/permissions";
import { jsonError, parseJson, resolveTreeAccessFromRequest } from "@/lib/server/request";

type RouteContext = {
  params: Promise<{ slug: string; relationshipId: string }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { slug, relationshipId } = await context.params;
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

  const existing = await prisma.relationship.findFirst({
    where: {
      id: relationshipId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return jsonError("Relationship not found.", 404);
  }

  if (needsStructuralModeration(access.tree.moderationMode, access.role)) {
    return jsonError(
      "Contributors cannot directly modify existing relationships while structural moderation is enabled.",
      403,
    );
  }

  const nextData = parsed.data;
  if (nextData.fromPersonId === nextData.toPersonId) {
    return jsonError("A relationship must connect two different people.", 422);
  }

  const [fromPerson, toPerson] = await Promise.all([
    prisma.person.findFirst({
      where: {
        id: nextData.fromPersonId,
        treeId: access.tree.id,
        deletedAt: null,
      },
    }),
    prisma.person.findFirst({
      where: {
        id: nextData.toPersonId,
        treeId: access.tree.id,
        deletedAt: null,
      },
    }),
  ]);

  if (!fromPerson || !toPerson) {
    return jsonError("Both people must exist before a relationship can be updated.", 404);
  }

  const duplicateRelationship = await prisma.relationship.findFirst({
    where: {
      treeId: access.tree.id,
      id: {
        not: relationshipId,
      },
      deletedAt: null,
      status: {
        in: ["ACTIVE", "PENDING"],
      },
      OR: duplicateRelationshipFilters(
        nextData.fromPersonId,
        nextData.toPersonId,
        nextData.type,
      ),
    },
  });

  if (duplicateRelationship) {
    return jsonError("That updated relationship would duplicate an existing connection.", 409);
  }

  const before = {
    fromPersonId: existing.fromPersonId,
    toPersonId: existing.toPersonId,
    type: existing.type,
    status: existing.status,
    note: existing.note,
    proposedByEditorId: existing.proposedByEditorId,
  };

  const relationship = await prisma.$transaction(async (tx) => {
    const updated = await tx.relationship.update({
      where: { id: relationshipId },
      data: {
        fromPersonId: nextData.fromPersonId,
        toPersonId: nextData.toPersonId,
        type: nextData.type,
        note: nextData.note ?? null,
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.RELATIONSHIP,
      entityId: relationshipId,
      action: EditAction.UPDATE,
      accessRole: access.role!,
      summary: "Updated a relationship.",
      before,
      after: {
        fromPersonId: updated.fromPersonId,
        toPersonId: updated.toPersonId,
        type: updated.type,
        status: updated.status,
        note: updated.note,
        proposedByEditorId: updated.proposedByEditorId,
      },
    });

    return updated;
  });

  return NextResponse.json({ relationship });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { slug, relationshipId } = await context.params;
  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access || !canEditRelationships(access.role)) {
    return jsonError("This link cannot edit relationships.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const existing = await prisma.relationship.findFirst({
    where: {
      id: relationshipId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return jsonError("Relationship not found.", 404);
  }

  if (needsStructuralModeration(access.tree.moderationMode, access.role)) {
    return jsonError(
      "Contributors cannot directly remove existing relationships while structural moderation is enabled.",
      403,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.relationship.update({
      where: { id: relationshipId },
      data: {
        deletedAt: new Date(),
        status: "REMOVED",
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.RELATIONSHIP,
      entityId: relationshipId,
      action: EditAction.SOFT_DELETE,
      accessRole: access.role!,
      summary: "Removed a relationship.",
      before: {
        fromPersonId: existing.fromPersonId,
        toPersonId: existing.toPersonId,
        type: existing.type,
        status: existing.status,
        note: existing.note,
        proposedByEditorId: existing.proposedByEditorId,
      },
      after: {
        deletedAt: new Date().toISOString(),
        status: "REMOVED",
      },
    });
  });

  return NextResponse.json({ ok: true });
}
