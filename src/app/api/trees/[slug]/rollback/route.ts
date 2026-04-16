import { EditAction, EditEntityType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { rollbackSchema } from "@/lib/shared/schemas";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { canRollback } from "@/lib/server/permissions";
import { jsonError, parseJson, resolveTreeAccessFromRequest } from "@/lib/server/request";
import { personDataFromInput } from "@/lib/server/tree-service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type Snapshot = Record<string, unknown>;

function asSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Snapshot;
}

function isPersonSnapshot(value: Snapshot | null): value is Snapshot & { firstName: string } {
  return Boolean(value && typeof value.firstName === "string");
}

function isRelationshipSnapshot(
  value: Snapshot | null,
): value is Snapshot & {
  fromPersonId: string;
  toPersonId: string;
  type: string;
  status: string;
} {
  return Boolean(
    value &&
      typeof value.fromPersonId === "string" &&
      typeof value.toPersonId === "string" &&
      typeof value.type === "string" &&
      typeof value.status === "string",
  );
}

function supportsRollback(history: {
  entityType: EditEntityType;
  action: EditAction;
}) {
  if (history.entityType === EditEntityType.PERSON) {
    return (
      history.action === EditAction.CREATE ||
      history.action === EditAction.UPDATE ||
      history.action === EditAction.SOFT_DELETE
    );
  }

  if (history.entityType === EditEntityType.RELATIONSHIP) {
    return (
      history.action === EditAction.CREATE ||
      history.action === EditAction.UPDATE ||
      history.action === EditAction.SOFT_DELETE ||
      history.action === EditAction.APPROVE ||
      history.action === EditAction.REJECT
    );
  }

  if (history.entityType === EditEntityType.CLAIM) {
    return history.action === EditAction.CLAIM;
  }

  return false;
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = await parseJson(request, rollbackSchema);

  if (!parsed.success) {
    return jsonError("Invalid rollback payload.", 422, parsed.error.flatten());
  }

  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access || !canRollback(access.role)) {
    return jsonError("Only the tree owner can roll changes back.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const history = await prisma.editHistory.findFirst({
    where: {
      id: parsed.data.historyId,
      treeId: access.tree.id,
      rolledBackAt: null,
    },
  });

  if (!history) {
    return jsonError("That history item could not be rolled back.", 404);
  }

  const before = asSnapshot(history.before);
  const after = asSnapshot(history.after);
  const previousRelationshipStatus =
    history.entityType === EditEntityType.RELATIONSHIP &&
    (history.action === EditAction.APPROVE || history.action === EditAction.REJECT) &&
    typeof before?.status === "string"
      ? before.status
      : null;

  if (!supportsRollback(history)) {
    return jsonError("That history entry cannot be rolled back safely.", 409);
  }

  if (
    history.entityType === EditEntityType.PERSON &&
    history.action !== EditAction.CREATE &&
    !isPersonSnapshot(before)
  ) {
    return jsonError("That person change is missing the snapshot needed for rollback.", 409);
  }

  if (
    history.entityType === EditEntityType.RELATIONSHIP &&
    (history.action === EditAction.UPDATE || history.action === EditAction.SOFT_DELETE) &&
    !isRelationshipSnapshot(before)
  ) {
    return jsonError(
      "That relationship change is missing the snapshot needed for rollback.",
      409,
    );
  }

  if (
    history.entityType === EditEntityType.RELATIONSHIP &&
    (history.action === EditAction.APPROVE || history.action === EditAction.REJECT) &&
    !previousRelationshipStatus
  ) {
    return jsonError("That moderation event is missing the previous status needed for rollback.", 409);
  }

  await prisma.$transaction(async (tx) => {
    if (history.entityType === EditEntityType.PERSON) {
      if (history.action === EditAction.CREATE) {
        await tx.person.update({
          where: { id: history.entityId },
          data: {
            deletedAt: new Date(),
          },
        });
      } else if (
        (history.action === EditAction.UPDATE || history.action === EditAction.SOFT_DELETE) &&
        before
      ) {
        await tx.person.update({
          where: { id: history.entityId },
          data: {
            ...personDataFromInput({
              firstName: String(before.firstName ?? ""),
              middleName: (before.middleName as string | null) ?? null,
              lastName: (before.lastName as string | null) ?? null,
              maidenName: (before.maidenName as string | null) ?? null,
              displayName: (before.displayName as string | null) ?? null,
              nickname: (before.nickname as string | null) ?? null,
              gender: (before.gender as never) ?? "UNSPECIFIED",
              lifeStatus: (before.lifeStatus as never) ?? "UNKNOWN",
              birthDate: (before.birthDate as string | null) ?? null,
              deathDate: (before.deathDate as string | null) ?? null,
              birthplace: (before.birthplace as string | null) ?? null,
              currentCity: (before.currentCity as string | null) ?? null,
              bio: (before.bio as string | null) ?? null,
              occupation: (before.occupation as string | null) ?? null,
              education: (before.education as string | null) ?? null,
              hobbies: (before.hobbies as string | null) ?? null,
              favoriteQuote: (before.favoriteQuote as string | null) ?? null,
              profilePhotoUrl: (before.profilePhotoUrl as string | null) ?? null,
              galleryPhotos: Array.isArray(before.galleryPhotos)
                ? before.galleryPhotos.map(String)
                : [],
              lifeEvents: Array.isArray(before.lifeEvents)
                ? before.lifeEvents.map(String)
                : [],
              notes: Array.isArray(before.notes) ? before.notes.map(String) : [],
              generation:
                typeof before.generation === "number" ? before.generation : null,
              branchKey: (before.branchKey as string | null) ?? null,
              layoutX: typeof before.layoutX === "number" ? before.layoutX : null,
              layoutY: typeof before.layoutY === "number" ? before.layoutY : null,
              isPrivate: Boolean(before.isPrivate),
            }),
            deletedAt:
              before.deletedAt && typeof before.deletedAt === "string"
                ? new Date(before.deletedAt)
                : null,
          },
        });
      }
    }

    if (history.entityType === EditEntityType.RELATIONSHIP) {
      if (history.action === EditAction.CREATE) {
        await tx.relationship.update({
          where: { id: history.entityId },
          data: {
            deletedAt: new Date(),
            status: "REMOVED",
          },
        });
      } else if (history.action === EditAction.APPROVE || history.action === EditAction.REJECT) {
        await tx.relationship.update({
          where: { id: history.entityId },
          data: {
            status: previousRelationshipStatus as never,
          },
        });
      } else if (isRelationshipSnapshot(before)) {
        await tx.relationship.update({
          where: { id: history.entityId },
          data: {
            fromPersonId: String(before.fromPersonId),
            toPersonId: String(before.toPersonId),
            type: before.type as never,
            status: before.status as never,
            note: (before.note as string | null) ?? null,
            proposedByEditorId: (before.proposedByEditorId as string | null) ?? null,
            deletedAt:
              before.deletedAt && typeof before.deletedAt === "string"
                ? new Date(before.deletedAt)
                : null,
          },
        });
      }
    }

    if (history.entityType === EditEntityType.CLAIM && after?.editorIdentityId) {
      await tx.editorIdentity.updateMany({
        where: {
          id: String(after.editorIdentityId),
          claimedPersonId: history.entityId,
        },
        data: {
          claimedPersonId: null,
        },
      });

      await tx.claimRecovery.deleteMany({
        where: {
          treeId: access.tree.id,
          OR: [
            { personId: history.entityId },
            { editorIdentityId: String(after.editorIdentityId) },
          ],
        },
      });
    }

    await tx.editHistory.update({
      where: { id: history.id },
      data: {
        rolledBackAt: new Date(),
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: history.entityType,
      entityId: history.entityId,
      action: EditAction.ROLLBACK,
      accessRole: access.role!,
      summary: `Rolled back: ${history.summary}`,
      before: (after as Prisma.InputJsonValue | null | undefined) ?? undefined,
      after: (before as Prisma.InputJsonValue | null | undefined) ?? undefined,
    });
  });

  return NextResponse.json({ ok: true });
}
