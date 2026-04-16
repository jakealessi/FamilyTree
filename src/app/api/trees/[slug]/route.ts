import { Prisma, RelationshipStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { canView } from "@/lib/server/permissions";
import { jsonError, readRequestTokens } from "@/lib/server/request";
import { resolveTreeAccess } from "@/lib/server/access";
import { prisma } from "@/lib/server/db";
import { buildTreeLink } from "@/lib/server/tokens";
import { toStringArray } from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function serializeJsonArray(value: Prisma.JsonValue | null | undefined) {
  return toStringArray(value ?? []);
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const tokens = readRequestTokens(request);
  const access = await resolveTreeAccess({
    slug,
    token: tokens.token,
    personalToken: tokens.personalToken,
    browserToken: tokens.browserToken,
  });

  if (!access || !canView(access.role)) {
    return jsonError("This family tree is private. Use one of its secure links to open it.", 401);
  }

  const tree = await prisma.familyTree.findUnique({
    where: { slug },
    include: {
      people: {
        where: {
          deletedAt: null,
        },
        include: {
          claimedBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
          media: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: [{ generation: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      },
      relationships: {
        where: {
          deletedAt: null,
          OR: [
            { status: RelationshipStatus.ACTIVE },
            { status: RelationshipStatus.PENDING },
          ],
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      editHistory: {
        orderBy: {
          createdAt: "desc",
        },
        take: 18,
        include: {
          editorIdentity: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!tree) {
    return jsonError("Tree not found.", 404);
  }

  const origin = new URL(request.url).origin;
  const visiblePersonIds = new Set(tree.people.map((person) => person.id));
  const visibleRelationships = tree.relationships.filter(
    (relationship) =>
      visiblePersonIds.has(relationship.fromPersonId) &&
      visiblePersonIds.has(relationship.toPersonId),
  );
  const activeRelationships = visibleRelationships.filter(
    (relationship) => relationship.status === RelationshipStatus.ACTIVE,
  );
  const pendingRelationships = visibleRelationships.filter(
    (relationship) => relationship.status === RelationshipStatus.PENDING,
  );
  const canSeeModerationQueue =
    access.role === "OWNER" || access.role === "CONTRIBUTOR";

  const response: TreeBundle = {
    tree: {
      id: tree.id,
      slug: tree.slug,
      title: tree.title,
      subtitle: tree.subtitle,
      description: tree.description,
      moderationMode: tree.moderationMode,
      status: tree.status,
      archivedAt: tree.archivedAt?.toISOString() ?? null,
      lastActivityAt: tree.lastActivityAt.toISOString(),
    },
    access: {
      role: access.role,
      isArchived: access.isArchived,
      claimedPersonId: access.claimedPersonId,
      editorIdentity: access.editorIdentity
        ? {
            id: access.editorIdentity.id,
            displayName: access.editorIdentity.displayName,
            accentColor: access.editorIdentity.accentColor,
            claimedPersonId: access.editorIdentity.claimedPersonId,
          }
        : null,
    },
    links:
      access.role === "OWNER"
        ? {
            owner: buildTreeLink(origin, tree.slug, tree.ownerToken),
            contributor: buildTreeLink(origin, tree.slug, tree.contributorToken),
            viewer: tree.viewerToken ? buildTreeLink(origin, tree.slug, tree.viewerToken) : null,
          }
        : undefined,
    people: tree.people.map((person) => ({
      id: person.id,
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
      galleryPhotos: serializeJsonArray(person.galleryPhotos),
      lifeEvents: serializeJsonArray(person.lifeEvents),
      notes: serializeJsonArray(person.notes),
      generation: person.generation,
      branchKey: person.branchKey,
      layoutX: person.layoutX,
      layoutY: person.layoutY,
      isPrivate: person.isPrivate,
      deletedAt: person.deletedAt?.toISOString() ?? null,
      claimedBy: person.claimedBy,
      media: person.media.map((media) => ({
        id: media.id,
        type: media.type,
        url: media.url,
        caption: media.caption,
        fileName: media.fileName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes ?? null,
      })),
    })),
    relationships: activeRelationships.map((relationship) => ({
      id: relationship.id,
      fromPersonId: relationship.fromPersonId,
      toPersonId: relationship.toPersonId,
      type: relationship.type,
      status: relationship.status,
      note: relationship.note,
      deletedAt: relationship.deletedAt?.toISOString() ?? null,
      proposedByEditorId: relationship.proposedByEditorId,
    })),
    history: tree.editHistory.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
      rolledBackAt: entry.rolledBackAt?.toISOString() ?? null,
      editorIdentity: entry.editorIdentity,
    })),
    moderationQueue: canSeeModerationQueue
      ? pendingRelationships.map((relationship) => ({
          id: relationship.id,
          fromPersonId: relationship.fromPersonId,
          toPersonId: relationship.toPersonId,
          type: relationship.type,
          note: relationship.note,
          createdAt: relationship.createdAt.toISOString(),
        }))
      : [],
  };

  return NextResponse.json(response);
}
