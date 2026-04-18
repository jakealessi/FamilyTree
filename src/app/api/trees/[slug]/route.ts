import { Prisma, RelationshipStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { canEditTree, canView } from "@/lib/server/permissions";
import { jsonError, readTreeAuth, resolveTreeAccessFromRequest } from "@/lib/server/request";
import { prisma } from "@/lib/server/db";
import { resolveMediaReferences } from "@/lib/server/media-storage";
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
  const tokens = await readTreeAuth(request);
  const access = await resolveTreeAccessFromRequest(request, slug);

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
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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

  const canEdit = canEditTree(access.role) || access.role === "PERSONAL";
  const myEditor =
    canEdit && tokens.browserToken
      ? {
          displayName: access.editorIdentity?.displayName ?? null,
          needsNamePrompt:
            access.role !== "OWNER" && !access.editorIdentity?.displayName?.trim(),
        }
      : undefined;

  const mediaReferences = new Set<string>();
  for (const person of tree.people) {
    if (person.profilePhotoUrl) {
      mediaReferences.add(person.profilePhotoUrl);
    }

    for (const galleryUrl of serializeJsonArray(person.galleryPhotos)) {
      mediaReferences.add(galleryUrl);
    }

    for (const media of person.media) {
      mediaReferences.add(media.url);
    }
  }
  const resolvedMediaReferences = await resolveMediaReferences([...mediaReferences]);
  const resolveMediaUrl = (value: string | null | undefined) =>
    value ? (resolvedMediaReferences.get(value) ?? value) : null;

  const response: TreeBundle = {
    tree: {
      id: tree.id,
      slug: tree.slug,
      title: tree.title,
      subtitle: tree.subtitle,
      description: tree.description,
      moderationMode: tree.moderationMode,
      status: tree.status,
      lastActivityAt: tree.lastActivityAt.toISOString(),
    },
    access: {
      role: access.role,
      isArchived: access.isArchived,
      claimedPersonId: access.claimedPersonId,
    },
    myEditor,
    account:
      access.role === "OWNER"
        ? {
            linkedToUser: Boolean(tree.ownerUserId),
          }
        : undefined,
    links:
      access.role === "OWNER"
        ? {
            owner: buildTreeLink(origin, tree.slug, tree.ownerToken),
            stable: buildTreeLink(origin, tree.slug),
            edit: buildTreeLink(origin, tree.slug, tree.contributorToken),
            viewer: tree.viewerToken ? buildTreeLink(origin, tree.slug, tree.viewerToken) : null,
          }
        : undefined,
    people: tree.people.map((person) => {
      const galleryPhotos = serializeJsonArray(person.galleryPhotos)
        .map((value) => resolveMediaUrl(value))
        .filter((value): value is string => Boolean(value));
      const media = person.media
        .map((mediaItem) => {
          const resolvedUrl = resolveMediaUrl(mediaItem.url);
          if (!resolvedUrl) {
            return null;
          }

          return {
            id: mediaItem.id,
            type: mediaItem.type,
            url: resolvedUrl,
            caption: mediaItem.caption,
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null);

      return {
        id: person.id,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        maidenName: person.maidenName,
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
        profilePhotoUrl: resolveMediaUrl(person.profilePhotoUrl),
        galleryPhotos,
        lifeEvents: serializeJsonArray(person.lifeEvents),
        notes: serializeJsonArray(person.notes),
        layoutX: person.layoutX,
        layoutY: person.layoutY,
        isPrivate: person.isPrivate,
        claimedBy: person.claimedBy,
        media,
      };
    }),
    relationships: activeRelationships.map((relationship) => ({
      id: relationship.id,
      fromPersonId: relationship.fromPersonId,
      toPersonId: relationship.toPersonId,
      type: relationship.type,
      status: relationship.status,
      note: relationship.note,
      proposedByEditorId: relationship.proposedByEditorId,
    })),
    history: tree.editHistory.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
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
        }))
      : [],
  };

  return NextResponse.json(response);
}
