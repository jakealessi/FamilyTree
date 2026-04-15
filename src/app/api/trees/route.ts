import { ModerationMode } from "@prisma/client";
import { NextResponse } from "next/server";

import { createTreeSchema } from "@/lib/shared/schemas";
import { prisma } from "@/lib/server/db";
import { jsonError, parseJson } from "@/lib/server/request";
import {
  buildTreeLink,
  generateOpaqueToken,
  generateTreeSlug,
} from "@/lib/server/tokens";

async function createUniqueSlug(title: string) {
  for (let index = 0; index < 8; index += 1) {
    const candidate = generateTreeSlug(title);
    const existing = await prisma.familyTree.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique family tree slug.");
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, createTreeSchema);

  if (!parsed.success) {
    return jsonError("Please check the create-tree form values.", 422, parsed.error.flatten());
  }

  const body = parsed.data;
  const ownerToken = generateOpaqueToken("owner");
  const contributorToken = generateOpaqueToken("contrib");
  const viewerToken = body.generateViewerLink ? generateOpaqueToken("viewer") : null;
  const origin = new URL(request.url).origin;
  let tree = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = await createUniqueSlug(body.title);

    try {
      tree = await prisma.familyTree.create({
        data: {
          slug,
          title: body.title,
          subtitle: body.subtitle ?? null,
          description: body.description ?? null,
          ownerToken,
          contributorToken,
          viewerToken,
          moderationMode:
            body.moderationMode === "OPEN"
              ? ModerationMode.OPEN
              : ModerationMode.REVIEW_STRUCTURE,
        },
      });
      break;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  if (!tree) {
    return jsonError("Could not allocate a unique family tree URL. Please try again.", 500);
  }

  return NextResponse.json({
    tree: {
      id: tree.id,
      slug: tree.slug,
      title: tree.title,
      subtitle: tree.subtitle,
      description: tree.description,
      moderationMode: tree.moderationMode,
    },
    links: {
      stable: buildTreeLink(origin, tree.slug),
      owner: buildTreeLink(origin, tree.slug, ownerToken),
      contributor: buildTreeLink(origin, tree.slug, contributorToken),
      viewer: viewerToken ? buildTreeLink(origin, tree.slug, viewerToken) : null,
    },
  });
}
