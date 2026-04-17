import { EditAction, EditEntityType, RelationshipType } from "@prisma/client";
import { NextResponse } from "next/server";

import { personPayloadSchema } from "@/lib/shared/schemas";
import { formatPersonName } from "@/lib/shared/utils";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import {
  canCreatePeople,
  needsStructuralModeration,
} from "@/lib/server/permissions";
import { jsonError, parseJson, resolveTreeAccessFromRequest } from "@/lib/server/request";
import { structuralParentPersonIdFromDb } from "@/lib/server/structural-parent";
import {
  personDataFromInput,
  relationshipStatusForSubmission,
  relationshipSummary,
} from "@/lib/server/tree-service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = await parseJson(request, personPayloadSchema);

  if (!parsed.success) {
    return jsonError("Invalid person payload.", 422, parsed.error.flatten());
  }

  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access || !canCreatePeople(access.role)) {
    return jsonError("This link does not allow creating people.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const { parentPersonId, childPersonId, ...personInput } = parsed.data;
  const data = personDataFromInput(personInput);

  if (parentPersonId) {
    const parent = await prisma.person.findFirst({
      where: {
        id: parentPersonId,
        treeId: access.tree.id,
        deletedAt: null,
      },
    });

    if (!parent) {
      return jsonError("Parent profile was not found in this tree.", 404);
    }
  }

  if (childPersonId) {
    const child = await prisma.person.findFirst({
      where: {
        id: childPersonId,
        treeId: access.tree.id,
        deletedAt: null,
      },
    });

    if (!child) {
      return jsonError("That profile was not found in this tree.", 404);
    }
  }

  let person;
  try {
    person = await prisma.$transaction(async (tx) => {
    const created = await tx.person.create({
      data: {
        treeId: access.tree.id,
        ...data,
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.PERSON,
      entityId: created.id,
      action: EditAction.CREATE,
      accessRole: access.role!,
      summary: `Added ${formatPersonName(created)} to the family tree.`,
      after: {
        id: created.id,
        ...data,
      },
    });

    if (parentPersonId) {
      const [fromPerson, toPerson] = await Promise.all([
        tx.person.findFirst({
          where: { id: parentPersonId, treeId: access.tree.id, deletedAt: null },
        }),
        tx.person.findFirst({
          where: { id: created.id, treeId: access.tree.id, deletedAt: null },
        }),
      ]);

      if (!fromPerson || !toPerson) {
        throw new Error("Person missing after create.");
      }

      const status = relationshipStatusForSubmission(
        needsStructuralModeration(access.tree.moderationMode, access.role),
      );

      const relationship = await tx.relationship.create({
        data: {
          treeId: access.tree.id,
          fromPersonId: parentPersonId,
          toPersonId: created.id,
          type: RelationshipType.PARENT,
          note: null,
          proposedByEditorId: access.editorIdentity?.id ?? null,
          status,
        },
      });

      await recordHistory(tx, {
        treeId: access.tree.id,
        editorIdentityId: access.editorIdentity?.id,
        entityType: EditEntityType.RELATIONSHIP,
        entityId: relationship.id,
        action: EditAction.CREATE,
        accessRole: access.role!,
        summary:
          status === "PENDING"
            ? `Proposed a structural edit: ${relationshipSummary(
                RelationshipType.PARENT,
                formatPersonName(fromPerson),
                formatPersonName(toPerson),
              )}`
            : relationshipSummary(
                RelationshipType.PARENT,
                formatPersonName(fromPerson),
                formatPersonName(toPerson),
              ),
        after: {
          id: relationship.id,
          fromPersonId: relationship.fromPersonId,
          toPersonId: relationship.toPersonId,
          type: relationship.type,
          status: relationship.status,
          note: relationship.note,
        },
      });
    }

    if (childPersonId) {
      if (childPersonId === created.id) {
        throw Object.assign(new Error("Invalid child link."), { code: "INVALID_CHILD" });
      }

      const existingParent = await structuralParentPersonIdFromDb(
        tx,
        access.tree.id,
        childPersonId,
      );
      if (existingParent !== null) {
        throw Object.assign(new Error("Child already has a parent."), {
          code: "CHILD_HAS_PARENT",
        });
      }

      const childPerson = await tx.person.findFirst({
        where: { id: childPersonId, treeId: access.tree.id, deletedAt: null },
      });

      if (!childPerson) {
        throw Object.assign(new Error("Child not found."), { code: "CHILD_NOT_FOUND" });
      }

      const status = relationshipStatusForSubmission(
        needsStructuralModeration(access.tree.moderationMode, access.role),
      );

      const relationship = await tx.relationship.create({
        data: {
          treeId: access.tree.id,
          fromPersonId: created.id,
          toPersonId: childPersonId,
          type: RelationshipType.PARENT,
          note: null,
          proposedByEditorId: access.editorIdentity?.id ?? null,
          status,
        },
      });

      await recordHistory(tx, {
        treeId: access.tree.id,
        editorIdentityId: access.editorIdentity?.id,
        entityType: EditEntityType.RELATIONSHIP,
        entityId: relationship.id,
        action: EditAction.CREATE,
        accessRole: access.role!,
        summary:
          status === "PENDING"
            ? `Proposed a structural edit: ${relationshipSummary(
                RelationshipType.PARENT,
                formatPersonName(created),
                formatPersonName(childPerson),
              )}`
            : relationshipSummary(
                RelationshipType.PARENT,
                formatPersonName(created),
                formatPersonName(childPerson),
              ),
        after: {
          id: relationship.id,
          fromPersonId: relationship.fromPersonId,
          toPersonId: relationship.toPersonId,
          type: relationship.type,
          status: relationship.status,
          note: relationship.note,
        },
      });
    }

    return created;
    });
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code === "CHILD_HAS_PARENT") {
      return jsonError(
        "That person already has a parent in this tree. Remove that link first, then add someone above.",
        409,
      );
    }
    if (code === "CHILD_NOT_FOUND" || code === "INVALID_CHILD") {
      return jsonError("Could not link the new person above that profile.", 422);
    }
    throw error;
  }

  return NextResponse.json({ person });
}
