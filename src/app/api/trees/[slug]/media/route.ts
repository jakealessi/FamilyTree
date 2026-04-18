import { EditAction, EditEntityType, MediaType } from "@prisma/client";
import { NextResponse } from "next/server";

import { DEFAULT_MAX_UPLOAD_BYTES } from "@/lib/shared/constants";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { storeUploadedImageFile } from "@/lib/server/media-storage";
import { canEditPerson } from "@/lib/server/permissions";
import { jsonError, resolveTreeAccessFromRequest } from "@/lib/server/request";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function isAllowedExternalImageUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await resolveTreeAccessFromRequest(request, slug);

  if (!access) {
    return jsonError("Tree not found.", 404);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const formData = await request.formData();
  const personId = String(formData.get("personId") ?? "");
  const type = String(formData.get("type") ?? "GALLERY");
  const caption = String(formData.get("caption") ?? "");
  const externalUrl = String(formData.get("externalUrl") ?? "");
  const file = formData.get("file");

  if (!personId) {
    return jsonError("A personId is required for media uploads.", 422);
  }

  if (!canEditPerson(access.role, personId, access.claimedPersonId)) {
    return jsonError("This link cannot edit that profile's media.", 403);
  }

  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      treeId: access.tree.id,
      deletedAt: null,
    },
  });

  if (!person) {
    return jsonError("Person not found.", 404);
  }

  let url = externalUrl.trim();
  let fileName: string | null = null;
  let mimeType: string | null = null;
  let sizeBytes: number | null = null;

  if (!url && file instanceof File) {
    const maxBytes = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? DEFAULT_MAX_UPLOAD_BYTES);
    if (file.size > maxBytes) {
      return jsonError("That file is too large.", 413);
    }

    if (!file.type.startsWith("image/")) {
      return jsonError("Only image uploads are supported for profile and gallery media.", 415);
    }

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      url = await storeUploadedImageFile({
        bytes,
        fileName: file.name,
        mimeType: file.type,
        treeSlug: access.tree.slug,
        personId,
        mediaType: type === "PROFILE" ? "PROFILE" : "GALLERY",
      });
      fileName = file.name;
      mimeType = file.type;
      sizeBytes = file.size;
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: string }).code)
          : "";

      if (code === "MEDIA_STORAGE_NOT_CONFIGURED") {
        return jsonError(
          "File uploads need storage configured in production. Add the Supabase storage env vars or paste an external image URL for now.",
          503,
        );
      }

      return jsonError("That image could not be uploaded right now.", 502);
    }
  }

  if (!url) {
    return jsonError("Provide either an uploaded file or an external URL.", 422);
  }

  if (!fileName && externalUrl && !isAllowedExternalImageUrl(externalUrl)) {
    return jsonError("External media URLs must be valid http or https image links.", 422);
  }

  const mediaType = Object.values(MediaType).includes(type as MediaType)
    ? (type as MediaType)
    : MediaType.GALLERY;

  const media = await prisma.$transaction(async (tx) => {
    const created = await tx.media.create({
      data: {
        treeId: access.tree.id,
        personId,
        type: mediaType,
        url,
        caption: caption || null,
        fileName,
        mimeType,
        sizeBytes,
      },
    });

    if (mediaType === MediaType.PROFILE) {
      await tx.person.update({
        where: { id: personId },
        data: {
          profilePhotoUrl: url,
        },
      });
    } else {
      const latestPerson = await tx.person.findUnique({
        where: { id: personId },
        select: {
          galleryPhotos: true,
        },
      });
      const gallery = Array.isArray(latestPerson?.galleryPhotos)
        ? latestPerson.galleryPhotos
        : [];
      await tx.person.update({
        where: { id: personId },
        data: {
          galleryPhotos: [...gallery, url],
        },
      });
    }

    await recordHistory(tx, {
      treeId: access.tree.id,
      editorIdentityId: access.editorIdentity?.id,
      entityType: EditEntityType.MEDIA,
      entityId: created.id,
      action: EditAction.CREATE,
      accessRole: access.role!,
      summary: `Added ${mediaType.toLowerCase()} media to ${person.firstName}.`,
      after: {
        id: created.id,
        personId,
        type: created.type,
        url: created.url,
      },
    });

    return created;
  });

  return NextResponse.json({ media });
}
