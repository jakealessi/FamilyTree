import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { personPayloadSchema } from "@/lib/shared/schemas";
import { formatPersonName } from "@/lib/shared/utils";
import { resolveTreeAccess } from "@/lib/server/access";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { canCreatePeople } from "@/lib/server/permissions";
import { jsonError, parseJson, readRequestTokens } from "@/lib/server/request";
import { personDataFromInput } from "@/lib/server/tree-service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = await parseJson(request, personPayloadSchema);

  if (!parsed.success) {
    return jsonError("Invalid person payload.", 422, parsed.error.flatten());
  }

  const tokens = readRequestTokens(request);
  const access = await resolveTreeAccess({
    slug,
    token: tokens.token,
    personalToken: tokens.personalToken,
    browserToken: tokens.browserToken,
  });

  if (!access || !canCreatePeople(access.role)) {
    return jsonError("This link does not allow creating people.", 403);
  }

  if (access.isArchived) {
    return jsonError("Archived trees must be reactivated before editing.", 409);
  }

  const data = personDataFromInput(parsed.data);

  const person = await prisma.$transaction(async (tx) => {
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

    return created;
  });

  return NextResponse.json({ person });
}
