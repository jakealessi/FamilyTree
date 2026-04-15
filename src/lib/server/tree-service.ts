import { Gender, LifeStatus, Prisma, RelationshipStatus, type RelationshipType } from "@prisma/client";

import { normalizeOptionalText, toOptionalDate, toStringArray } from "@/lib/shared/utils";

export function personDataFromInput(input: {
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  maidenName?: string | null;
  displayName?: string | null;
  nickname?: string | null;
  gender?: Gender | "UNSPECIFIED" | "FEMALE" | "MALE" | "NON_BINARY" | "OTHER";
  lifeStatus?: LifeStatus | "UNKNOWN" | "LIVING" | "DECEASED";
  birthDate?: string | null;
  deathDate?: string | null;
  birthplace?: string | null;
  currentCity?: string | null;
  bio?: string | null;
  occupation?: string | null;
  education?: string | null;
  hobbies?: string | null;
  favoriteQuote?: string | null;
  profilePhotoUrl?: string | null;
  galleryPhotos?: string[];
  lifeEvents?: string[];
  notes?: string[];
  generation?: number | null;
  branchKey?: string | null;
  layoutX?: number | null;
  layoutY?: number | null;
  isPrivate?: boolean;
}) {
  return {
    firstName: input.firstName.trim(),
    middleName: normalizeOptionalText(input.middleName),
    lastName: normalizeOptionalText(input.lastName),
    maidenName: normalizeOptionalText(input.maidenName),
    displayName: normalizeOptionalText(input.displayName),
    nickname: normalizeOptionalText(input.nickname),
    gender: input.gender ?? Gender.UNSPECIFIED,
    lifeStatus: input.lifeStatus ?? LifeStatus.UNKNOWN,
    birthDate: toOptionalDate(input.birthDate),
    deathDate: toOptionalDate(input.deathDate),
    birthplace: normalizeOptionalText(input.birthplace),
    currentCity: normalizeOptionalText(input.currentCity),
    bio: normalizeOptionalText(input.bio),
    occupation: normalizeOptionalText(input.occupation),
    education: normalizeOptionalText(input.education),
    hobbies: normalizeOptionalText(input.hobbies),
    favoriteQuote: normalizeOptionalText(input.favoriteQuote),
    profilePhotoUrl: normalizeOptionalText(input.profilePhotoUrl),
    galleryPhotos: toStringArray(input.galleryPhotos),
    lifeEvents: toStringArray(input.lifeEvents),
    notes: toStringArray(input.notes),
    generation: input.generation ?? null,
    branchKey: normalizeOptionalText(input.branchKey),
    layoutX: input.layoutX ?? null,
    layoutY: input.layoutY ?? null,
    isPrivate: input.isPrivate ?? true,
  } satisfies Prisma.PersonUncheckedUpdateInput;
}

export function relationshipStatusForSubmission(shouldModerate: boolean) {
  return shouldModerate ? RelationshipStatus.PENDING : RelationshipStatus.ACTIVE;
}

export function relationshipSummary(type: RelationshipType, fromLabel: string, toLabel: string) {
  const relationshipText = type.toLowerCase().replace(/_/g, " ");
  return `${fromLabel} connected ${toLabel} as ${relationshipText}.`;
}
