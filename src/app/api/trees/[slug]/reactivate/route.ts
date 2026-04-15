import { EditAction, EditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";

import { resolveTreeAccess } from "@/lib/server/access";
import { prisma } from "@/lib/server/db";
import { recordHistory } from "@/lib/server/history";
import { jsonError, readRequestTokens } from "@/lib/server/request";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const tokens = readRequestTokens(request);
  const body = ((await request.json().catch(() => ({}))) ?? {}) as {
    adminRecoveryToken?: string;
  };
  const adminRecoveryValid =
    Boolean(process.env.ADMIN_RECOVERY_TOKEN) &&
    body.adminRecoveryToken === process.env.ADMIN_RECOVERY_TOKEN;

  const access = await resolveTreeAccess({
    slug,
    token: tokens.token,
    personalToken: tokens.personalToken,
    browserToken: tokens.browserToken,
  });
  const tree = access?.tree ?? (await prisma.familyTree.findUnique({ where: { slug } }));

  if (!tree) {
    return jsonError("Tree not found.", 404);
  }

  if ((!access || access.role !== "OWNER") && !adminRecoveryValid) {
    return jsonError(
      "Only the owner link or a valid admin recovery token can reactivate this tree.",
      403,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyTree.update({
      where: { id: tree.id },
      data: {
        status: "ACTIVE",
        archivedAt: null,
        lastActivityAt: new Date(),
      },
    });

    await recordHistory(tx, {
      treeId: tree.id,
      editorIdentityId: access?.editorIdentity?.id,
      entityType: EditEntityType.FAMILY_TREE,
      entityId: tree.id,
      action: EditAction.REACTIVATE,
      accessRole: access?.role ?? "OWNER",
      summary: "Reactivated the archived family tree.",
    });
  });

  return NextResponse.json({ ok: true });
}
