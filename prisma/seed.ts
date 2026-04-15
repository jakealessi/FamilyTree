import {
  AccessRole,
  EditAction,
  EditEntityType,
  Gender,
  LifeStatus,
  MediaType,
  ModerationMode,
  PrismaClient,
  RelationshipStatus,
  RelationshipType,
} from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";

const prisma = new PrismaClient();

function opaqueToken(prefix: string) {
  return `${prefix}_${randomBytes(18).toString("base64url")}`;
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function recoveryCode() {
  return Array.from({ length: 4 }, () =>
    randomBytes(2).toString("hex").toUpperCase(),
  ).join("-");
}

async function main() {
  const slug = "hawthorne-family";
  const ownerToken = opaqueToken("owner");
  const contributorToken = opaqueToken("contrib");
  const viewerToken = opaqueToken("viewer");
  const personalToken = opaqueToken("personal");
  const recovery = recoveryCode();

  await prisma.claimRecovery.deleteMany();
  await prisma.editHistory.deleteMany();
  await prisma.media.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.editorIdentity.deleteMany();
  await prisma.person.deleteMany();
  await prisma.familyTree.deleteMany({ where: { slug } });

  const tree = await prisma.familyTree.create({
    data: {
      slug,
      title: "Hawthorne Family",
      subtitle: "A living, collaborative family archive",
      description:
        "A seeded demo tree with multiple generations, relationships, and media so the workspace has something meaningful to render immediately.",
      ownerToken,
      contributorToken,
      viewerToken,
      moderationMode: ModerationMode.REVIEW_STRUCTURE,
      people: {
        create: [
          {
            firstName: "Eleanor",
            lastName: "Hawthorne",
            displayName: "Eleanor Hawthorne",
            gender: Gender.FEMALE,
            lifeStatus: LifeStatus.LIVING,
            birthDate: new Date("1954-05-12"),
            birthplace: "Savannah, Georgia",
            currentCity: "Charleston, South Carolina",
            occupation: "Botanical illustrator",
            education: "Savannah College of Art and Design",
            hobbies: "Rose gardening, plein-air painting",
            favoriteQuote: "The family story grows whenever we remember it together.",
            bio: "Family storyteller, photo keeper, and keeper of the original recipe box.",
            profilePhotoUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
            galleryPhotos: [
              "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80",
            ],
            lifeEvents: [
              "1978: Married Thomas in Beaufort",
              "1986: Moved the family to Charleston",
            ],
            notes: ["Knows most of the cousins' birthdays by heart."],
            branchKey: "trunk",
            generation: 0,
            layoutX: 240,
            layoutY: 80,
          },
          {
            firstName: "Thomas",
            lastName: "Hawthorne",
            displayName: "Thomas Hawthorne",
            gender: Gender.MALE,
            lifeStatus: LifeStatus.LIVING,
            birthDate: new Date("1952-11-03"),
            birthplace: "Asheville, North Carolina",
            currentCity: "Charleston, South Carolina",
            occupation: "Architect",
            hobbies: "Fishing, hand-drawn maps",
            bio: "Builder of homes, amateur arborist, and patient note-taker.",
            profilePhotoUrl:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
            branchKey: "trunk",
            generation: 0,
            layoutX: 520,
            layoutY: 80,
          },
          {
            firstName: "Grace",
            lastName: "Hawthorne",
            displayName: "Grace Alvarez",
            maidenName: "Hawthorne",
            gender: Gender.FEMALE,
            lifeStatus: LifeStatus.LIVING,
            birthDate: new Date("1981-08-24"),
            birthplace: "Charleston, South Carolina",
            currentCity: "Raleigh, North Carolina",
            occupation: "Pediatric nurse",
            education: "UNC Chapel Hill",
            hobbies: "Trail running, scrapbooking",
            bio: "One of the family organizers and a frequent contributor to the tree.",
            profilePhotoUrl:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
            lifeEvents: [
              "2008: Married Mateo Alvarez",
              "2013: Welcomed twins Noah and Ivy",
            ],
            branchKey: "oak",
            generation: 1,
            layoutX: 300,
            layoutY: 280,
          },
          {
            firstName: "Mateo",
            lastName: "Alvarez",
            displayName: "Mateo Alvarez",
            gender: Gender.MALE,
            lifeStatus: LifeStatus.LIVING,
            birthDate: new Date("1980-02-16"),
            currentCity: "Raleigh, North Carolina",
            occupation: "Civil engineer",
            hobbies: "Cycling, woodworking",
            branchKey: "oak",
            generation: 1,
            layoutX: 560,
            layoutY: 280,
          },
          {
            firstName: "Noah",
            lastName: "Alvarez",
            gender: Gender.MALE,
            lifeStatus: LifeStatus.LIVING,
            birthDate: new Date("2013-06-11"),
            currentCity: "Raleigh, North Carolina",
            hobbies: "Soccer, robotics",
            branchKey: "oak",
            generation: 2,
            layoutX: 240,
            layoutY: 500,
          },
          {
            firstName: "Ivy",
            lastName: "Alvarez",
            gender: Gender.FEMALE,
            lifeStatus: LifeStatus.LIVING,
            birthDate: new Date("2013-06-11"),
            currentCity: "Raleigh, North Carolina",
            hobbies: "Piano, mushroom hunting",
            branchKey: "oak",
            generation: 2,
            layoutX: 460,
            layoutY: 500,
          },
          {
            firstName: "Margaret",
            lastName: "Reed",
            displayName: "Margaret Reed",
            gender: Gender.FEMALE,
            lifeStatus: LifeStatus.DECEASED,
            birthDate: new Date("1931-09-18"),
            deathDate: new Date("2018-03-02"),
            birthplace: "Macon, Georgia",
            bio: "Remembered for peach preserves, Sunday hymns, and handwritten letters.",
            branchKey: "roots",
            generation: -1,
            layoutX: 120,
            layoutY: -120,
          },
        ],
      },
    },
    include: {
      people: true,
    },
  });

  const people = new Map(tree.people.map((person) => [person.firstName, person]));

  const grace = people.get("Grace");
  const noah = people.get("Noah");
  const ivy = people.get("Ivy");
  const eleanor = people.get("Eleanor");
  const thomas = people.get("Thomas");
  const mateo = people.get("Mateo");
  const margaret = people.get("Margaret");

  if (!grace || !noah || !ivy || !eleanor || !thomas || !mateo || !margaret) {
    throw new Error("Seed people were not created correctly.");
  }

  await prisma.relationship.createMany({
    data: [
      {
        treeId: tree.id,
        fromPersonId: eleanor.id,
        toPersonId: thomas.id,
        type: RelationshipType.SPOUSE,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: eleanor.id,
        toPersonId: grace.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: thomas.id,
        toPersonId: grace.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: margaret.id,
        toPersonId: eleanor.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: grace.id,
        toPersonId: mateo.id,
        type: RelationshipType.SPOUSE,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: grace.id,
        toPersonId: noah.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: mateo.id,
        toPersonId: noah.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: grace.id,
        toPersonId: ivy.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.ACTIVE,
      },
      {
        treeId: tree.id,
        fromPersonId: mateo.id,
        toPersonId: ivy.id,
        type: RelationshipType.PARENT,
        status: RelationshipStatus.PENDING,
        note: "Pending moderation example for structural edits.",
      },
      {
        treeId: tree.id,
        fromPersonId: noah.id,
        toPersonId: ivy.id,
        type: RelationshipType.SIBLING,
        status: RelationshipStatus.ACTIVE,
      },
    ],
  });

  const editor = await prisma.editorIdentity.create({
    data: {
      treeId: tree.id,
      browserTokenHash: hashToken("seed-browser-token"),
      displayName: "Grace on Safari",
      accentColor: "#9B6B3E",
      claimedPersonId: grace.id,
    },
  });

  await prisma.media.createMany({
    data: [
      {
        treeId: tree.id,
        personId: grace.id,
        type: MediaType.PROFILE,
        url: grace.profilePhotoUrl ?? "",
        fileName: "grace-profile.jpg",
        mimeType: "image/jpeg",
      },
      {
        treeId: tree.id,
        personId: eleanor.id,
        type: MediaType.GALLERY,
        url:
          "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80",
        fileName: "picnic.jpg",
        mimeType: "image/jpeg",
        caption: "Family picnic by the marsh, 1996.",
      },
    ],
  });

  await prisma.claimRecovery.create({
    data: {
      treeId: tree.id,
      personId: grace.id,
      editorIdentityId: editor.id,
      recoveryCodeHash: hashToken(recovery),
      personalLinkTokenHash: hashToken(personalToken),
    },
  });

  await prisma.editHistory.create({
    data: {
      treeId: tree.id,
      editorIdentityId: editor.id,
      entityType: EditEntityType.CLAIM,
      entityId: grace.id,
      action: EditAction.CLAIM,
      accessRole: AccessRole.CONTRIBUTOR,
      summary: "Grace claimed her profile and generated a personal recovery link.",
      after: {
        personId: grace.id,
        personalTokenPreview: `${personalToken.slice(0, 12)}...`,
      },
    },
  });

  console.log("Seeded demo tree:");
  console.log(`Tree URL: http://localhost:3000/tree/${slug}`);
  console.log(`Owner link: http://localhost:3000/tree/${slug}?token=${ownerToken}`);
  console.log(
    `Contributor link: http://localhost:3000/tree/${slug}?token=${contributorToken}`,
  );
  console.log(`Viewer link: http://localhost:3000/tree/${slug}?token=${viewerToken}`);
  console.log(`Personal claim link: http://localhost:3000/tree/${slug}?personal=${personalToken}`);
  console.log(`Recovery code: ${recovery}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
