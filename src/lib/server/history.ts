import {
  type AccessRole,
  EditAction,
  type EditEntityType,
  Prisma,
  PrismaClient,
} from "@prisma/client";

type DbClient = Prisma.TransactionClient | PrismaClient;

type HistoryInput = {
  treeId: string;
  editorIdentityId?: string | null;
  entityType: EditEntityType;
  entityId: string;
  action: EditAction;
  accessRole: AccessRole;
  summary: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

export async function recordHistory(db: DbClient, input: HistoryInput) {
  await Promise.all([
    db.editHistory.create({
      data: {
        treeId: input.treeId,
        editorIdentityId: input.editorIdentityId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        accessRole: input.accessRole,
        summary: input.summary,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      },
    }),
    db.familyTree.update({
      where: { id: input.treeId },
      data: {
        lastActivityAt: new Date(),
        archivedAt: null,
        status: "ACTIVE",
      },
    }),
  ]);
}
