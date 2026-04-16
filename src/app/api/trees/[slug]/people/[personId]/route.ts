import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { personPayloadSchema } from "@/lib/shared/schemas";
import { formatPersonName, toStringArray } from "@/lib/shared/utils";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { canDeletePerson, canEditPerson } from "@/lib/server/permissions";
import { jsonError, parseJson, resolveTreeAccessFromRequest } from "@/lib/server/request";
import { personDataFromInput } from "@/lib/server/tree-service";

type RouteContext = {
  params: Promise<{ slug: string; personId: string }>;
};

function serializePersonSnapshot(person: {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  maidenName: string | null;
  displayName: string | null;
  nickname: string | null;
  gender: string;
  lifeStatus: string;
  birthDate: Date | null;
  deathDate: Date | null;
  birthplace: string | null;
  currentCity: string | null;
  bio: string | null;
  occupation: string | null;
  education: string | null;
  hobbies: string | null;
  favoriteQuote: string | null;
  profilePhotoUrl: string | null;
  galleryPhotos: unknown;
  lifeEvents: unknown;
  notes: unknown;
  generation: number | null;
  branchKey: string | null;
  layoutX: number | null;
  layoutY: number | null;
  isPrivate: boolean;
  deletedAt: Date | null;
}) {
  return {
    firstName: person.firstName,
    middleName: person.middleName,
    lastName: person.lastName,
    maidenName: person.maidenName,
    displayName: person.displayName,
    nickname: person.nickname,
    gender: person.gender,
    lifeStatus: person.lifeStatus,
    birthDate: person.birthDate?.toISOString() ?? null,
    deathDate: person.deathDate?.toISOString() ?? null,
    birthplace: person.birthplace,
    currentCity: person.currentCity,
    bio: person.bio,
    occupation: person.occupation,
    education: person.education,
    hobbies: person.hobbies,
    favoriteQuote: person.favoriteQuote,
    profilePhotoUrl: person.profilePhotoUrl,
    galleryPhotos: toStringArray(person.galleryPhotos),
    lifeEvents: toStringArray(person.lifeEvents),
    notes: toStringArray(person.notes),
    generation: person.generation,
    branchKey: person.branchKey,
    layoutX: person.layoutX,
    layoutY: person.layoutY,
    isPrivate: person.isPrivate,
    deletedAt: person.deletedAt?.toISOString() ?? null,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { slug, personId } = await context.params;
  const parsed = await parseJson(request, personPayloadSchema);

  if (!parsed.success) {
    return jsonError("Invalid person update payload.", 422, parsed.error.flatten());
  }

  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access) {
    return jsonError("Tree not found.", 404);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const existing = await prisma.person.findFirst({
    where: {
      id: personId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return jsonError("Person not found.", 404);
  }

  if (!canEditPerson(access.role, personId, access.claimedPersonId)) {
    return jsonError("This link cannot edit that profile.", 403);
  }

  const before = serializePersonSnapshot(existing);
  const nextData = personDataFromInput(parsed.data);

  const person = await prisma.$transaction(async (tx) => {
    const updated = await tx.person.update({
      where: { id: personId },
      data: nextData,
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.PERSON,
      entityId: personId,
      action: EditAction.UPDATE,
      accessRole: access.role!,
      summary: `Updated ${formatPersonName(updated)}.`,
      before,
      after: {
        id: updated.id,
        ...nextData,
      },
    });

    return updated;
  });

  return NextResponse.json({ person });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { slug, personId } = await context.params;
  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access || !canDeletePerson(access.role)) {
    return jsonError("This link cannot archive people.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const existing = await prisma.person.findFirst({
    where: {
      id: personId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return jsonError("Person not found.", 404);
  }

  const before = serializePersonSnapshot(existing);

  await prisma.$transaction(async (tx) => {
    await tx.person.update({
      where: { id: personId },
      data: {
        deletedAt: new Date(),
      },
    });

    await tx.editorIdentity.updateMany({
      where: {
        treeId: access.tree.id,
        claimedPersonId: personId,
      },
      data: {
        claimedPersonId: null,
      },
    });

    await tx.claimRecovery.deleteMany({
      where: {
        treeId: access.tree.id,
        personId,
      },
    });

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.PERSON,
      entityId: personId,
      action: EditAction.SOFT_DELETE,
      accessRole: access.role!,
      summary: `Archived ${formatPersonName(existing)}.`,
      before,
      after: {
        deletedAt: new Date().toISOString(),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
