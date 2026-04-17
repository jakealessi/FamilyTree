import type { Prisma } from "@prisma/client";
import { RelationshipType } from "@prisma/client";

const PARENT_LIKE: RelationshipType[] = [
  RelationshipType.PARENT,
  RelationshipType.ADOPTED,
  RelationshipType.STEP,
  RelationshipType.FOSTER,
];

/** Same rules as `structuralParentId` in bracket-layout, against DB rows in a transaction. */
export async function structuralParentPersonIdFromDb(
  tx: Prisma.TransactionClient,
  treeId: string,
  personId: string,
): Promise<string | null> {
  const rels = await tx.relationship.findMany({
    where: {
      treeId,
      deletedAt: null,
      status: { in: ["ACTIVE", "PENDING"] },
      OR: [
        { type: { in: PARENT_LIKE }, toPersonId: personId },
        { type: RelationshipType.CHILD, fromPersonId: personId },
      ],
    },
  });

  for (const r of rels) {
    if (PARENT_LIKE.includes(r.type) && r.toPersonId === personId) {
      return r.fromPersonId;
    }
    if (r.type === RelationshipType.CHILD && r.fromPersonId === personId) {
      return r.toPersonId;
    }
  }

  return null;
}
