-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TreeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'VIEWER', 'PERSONAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('UNSPECIFIED', 'FEMALE', 'MALE', 'NON_BINARY', 'OTHER');

-- CreateEnum
CREATE TYPE "LifeStatus" AS ENUM ('UNKNOWN', 'LIVING', 'DECEASED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'ADOPTED', 'STEP', 'FOSTER');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PROFILE', 'GALLERY', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EditEntityType" AS ENUM ('FAMILY_TREE', 'PERSON', 'RELATIONSHIP', 'MEDIA', 'CLAIM');

-- CreateEnum
CREATE TYPE "EditAction" AS ENUM ('CREATE', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'APPROVE', 'REJECT', 'ROLLBACK', 'CLAIM', 'REACTIVATE');

-- CreateEnum
CREATE TYPE "ModerationMode" AS ENUM ('OPEN', 'REVIEW_STRUCTURE');

-- CreateTable
CREATE TABLE "FamilyTree" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "ownerToken" TEXT NOT NULL,
    "contributorToken" TEXT NOT NULL,
    "viewerToken" TEXT,
    "moderationMode" "ModerationMode" NOT NULL DEFAULT 'REVIEW_STRUCTURE',
    "status" "TreeStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorIdentity" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "browserTokenHash" TEXT NOT NULL,
    "displayName" TEXT,
    "accentColor" TEXT,
    "claimedPersonId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT,
    "maidenName" TEXT,
    "displayName" TEXT,
    "nickname" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'UNSPECIFIED',
    "lifeStatus" "LifeStatus" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3),
    "deathDate" TIMESTAMP(3),
    "birthplace" TEXT,
    "currentCity" TEXT,
    "bio" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "hobbies" TEXT,
    "favoriteQuote" TEXT,
    "profilePhotoUrl" TEXT,
    "galleryPhotos" JSONB,
    "lifeEvents" JSONB,
    "notes" JSONB,
    "generation" INTEGER,
    "branchKey" TEXT,
    "layoutX" DOUBLE PRECISION,
    "layoutY" DOUBLE PRECISION,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "proposedByEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "caption" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditHistory" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "editorIdentityId" TEXT,
    "entityType" "EditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "EditAction" NOT NULL,
    "accessRole" "AccessRole" NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "EditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRecovery" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "editorIdentityId" TEXT,
    "recoveryCodeHash" TEXT NOT NULL,
    "personalLinkTokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_slug_key" ON "FamilyTree"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_ownerToken_key" ON "FamilyTree"("ownerToken");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_contributorToken_key" ON "FamilyTree"("contributorToken");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTree_viewerToken_key" ON "FamilyTree"("viewerToken");

-- CreateIndex
CREATE INDEX "FamilyTree_lastActivityAt_idx" ON "FamilyTree"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "EditorIdentity_claimedPersonId_key" ON "EditorIdentity"("claimedPersonId");

-- CreateIndex
CREATE INDEX "EditorIdentity_treeId_idx" ON "EditorIdentity"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorIdentity_treeId_browserTokenHash_key" ON "EditorIdentity"("treeId", "browserTokenHash");

-- CreateIndex
CREATE INDEX "Person_treeId_lastName_firstName_idx" ON "Person"("treeId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Person_treeId_deletedAt_idx" ON "Person"("treeId", "deletedAt");

-- CreateIndex
CREATE INDEX "Relationship_treeId_status_idx" ON "Relationship"("treeId", "status");

-- CreateIndex
CREATE INDEX "Relationship_fromPersonId_idx" ON "Relationship"("fromPersonId");

-- CreateIndex
CREATE INDEX "Relationship_toPersonId_idx" ON "Relationship"("toPersonId");

-- CreateIndex
CREATE INDEX "Media_treeId_personId_idx" ON "Media"("treeId", "personId");

-- CreateIndex
CREATE INDEX "EditHistory_treeId_createdAt_idx" ON "EditHistory"("treeId", "createdAt");

-- CreateIndex
CREATE INDEX "EditHistory_treeId_entityType_entityId_idx" ON "EditHistory"("treeId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimRecovery_recoveryCodeHash_key" ON "ClaimRecovery"("recoveryCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimRecovery_personalLinkTokenHash_key" ON "ClaimRecovery"("personalLinkTokenHash");

-- CreateIndex
CREATE INDEX "ClaimRecovery_treeId_personId_idx" ON "ClaimRecovery"("treeId", "personId");

-- AddForeignKey
ALTER TABLE "EditorIdentity" ADD CONSTRAINT "EditorIdentity_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorIdentity" ADD CONSTRAINT "EditorIdentity_claimedPersonId_fkey" FOREIGN KEY ("claimedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditHistory" ADD CONSTRAINT "EditHistory_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditHistory" ADD CONSTRAINT "EditHistory_editorIdentityId_fkey" FOREIGN KEY ("editorIdentityId") REFERENCES "EditorIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRecovery" ADD CONSTRAINT "ClaimRecovery_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRecovery" ADD CONSTRAINT "ClaimRecovery_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRecovery" ADD CONSTRAINT "ClaimRecovery_editorIdentityId_fkey" FOREIGN KEY ("editorIdentityId") REFERENCES "EditorIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
