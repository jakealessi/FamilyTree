import { ModerationMode } from "@prisma/client";
import { NextResponse } from "next/server";

import { createTreeSchema } from "@/lib/shared/schemas";
import { prisma } from "@/lib/server/db";
import { jsonError, parseJson, readTreeAuth } from "@/lib/server/request";
import {
  buildTreeLink,
  generateOpaqueToken,
  generateTreeSlug,
  hashToken,
} from "@/lib/server/tokens";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

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

  const auth = await readTreeAuth(request);
  const body = parsed.data;
  const origin = new URL(request.url).origin;
  const ownerBrowserTokenHash = body.ownerBrowserToken
    ? hashToken(body.ownerBrowserToken)
    : null;
  let tree = null;
  let ownerToken: string | null = null;
  let contributorToken: string | null = null;
  let viewerToken: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = await createUniqueSlug(body.title);
    ownerToken = generateOpaqueToken("owner");
    contributorToken = generateOpaqueToken("contrib");
    viewerToken = body.generateViewerLink ? generateOpaqueToken("viewer") : null;

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
          ownerBrowserTokenHash,
          ownerUserId: auth.userId ?? null,
          moderationMode:
            body.moderationMode === "OPEN"
              ? ModerationMode.OPEN
              : ModerationMode.REVIEW_STRUCTURE,
        },
      });
      break;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }

      throw error;
    }
  }

  if (!tree) {
    return jsonError("Could not allocate a unique family tree URL. Please try again.", 500);
  }

  return NextResponse.json({
    slug: tree.slug,
    links: {
      owner: buildTreeLink(origin, tree.slug, ownerToken),
      stable: buildTreeLink(origin, tree.slug),
      edit: buildTreeLink(origin, tree.slug, contributorToken),
      viewer: viewerToken ? buildTreeLink(origin, tree.slug, viewerToken) : null,
    },
  });
}
