import { AccessRole, type EditorIdentity, type FamilyTree } from "@prisma/client";
import { differenceInMonths } from "date-fns";

import { ARCHIVE_AFTER_MONTHS } from "@/lib/shared/constants";

import { prisma } from "./db";
import { hashToken } from "./tokens";

export type AccessContext = {
  tree: FamilyTree;
  role: AccessRole | null;
  editorIdentity: EditorIdentity | null;
  claimedPersonId: string | null;
  isArchived: boolean;
  token: string | null;
  personalToken: string | null;
};

export function isTreeArchived(tree: Pick<FamilyTree, "status" | "lastActivityAt">) {
  return (
    tree.status === "ARCHIVED" ||
    differenceInMonths(new Date(), tree.lastActivityAt) >= ARCHIVE_AFTER_MONTHS
  );
}

export async function resolveTreeAccess(args: {
  slug: string;
  token?: string | null;
  personalToken?: string | null;
  browserToken?: string | null;
}) {
  const tree = await prisma.familyTree.findUnique({
    where: { slug: args.slug },
  });

  if (!tree) {
    return null;
  }

  let role: AccessRole | null = null;
  let claimedPersonId: string | null = null;

  if (args.personalToken) {
    const recovery = await prisma.claimRecovery.findFirst({
      where: {
        treeId: tree.id,
        personalLinkTokenHash: hashToken(args.personalToken),
      },
      include: {
        person: true,
      },
    });

    if (recovery && !recovery.person.deletedAt) {
      role = AccessRole.PERSONAL;
      claimedPersonId = recovery.personId;
    }
  }

  if (!role && args.token) {
    if (args.token === tree.ownerToken) {
      role = AccessRole.OWNER;
    } else if (args.token === tree.contributorToken) {
      role = AccessRole.CONTRIBUTOR;
    } else if (tree.viewerToken && args.token === tree.viewerToken) {
      role = AccessRole.VIEWER;
    }
  }

  let editorIdentity: EditorIdentity | null = null;
  if (args.browserToken) {
    editorIdentity = await prisma.editorIdentity.findUnique({
      where: {
        treeId_browserTokenHash: {
          treeId: tree.id,
          browserTokenHash: hashToken(args.browserToken),
        },
      },
    });

    if (editorIdentity?.claimedPersonId && role !== AccessRole.PERSONAL) {
      claimedPersonId = editorIdentity.claimedPersonId;
    }
  }

  return {
    tree,
    role,
    editorIdentity,
    claimedPersonId,
    isArchived: isTreeArchived(tree),
    token: args.token ?? null,
    personalToken: args.personalToken ?? null,
  } satisfies AccessContext;
}
