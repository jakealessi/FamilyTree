import { z } from "zod";

const optionalText = z.string().trim().optional().nullable();
const optionalDate = z.union([z.string().trim(), z.null()]).optional();

export const createTreeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: optionalText,
  description: optionalText,
  generateViewerLink: z.boolean().optional().default(true),
  moderationMode: z
    .enum(["OPEN", "REVIEW_STRUCTURE"])
    .optional()
    .default("REVIEW_STRUCTURE"),
  ownerBrowserToken: z.string().trim().min(16).optional(),
});

export const registerSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().max(80).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(200),
});

export const resolveIdentitySchema = z.object({
  browserToken: z.string().trim().min(16),
  displayName: optionalText,
});

export const personPayloadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  middleName: optionalText,
  lastName: optionalText,
  maidenName: optionalText,
  displayName: optionalText,
  nickname: optionalText,
  gender: z
    .enum(["UNSPECIFIED", "FEMALE", "MALE", "NON_BINARY", "OTHER"])
    .optional()
    .default("UNSPECIFIED"),
  lifeStatus: z.enum(["UNKNOWN", "LIVING", "DECEASED"]).optional().default("UNKNOWN"),
  birthDate: optionalDate,
  deathDate: optionalDate,
  birthplace: optionalText,
  currentCity: optionalText,
  bio: optionalText,
  occupation: optionalText,
  education: optionalText,
  hobbies: optionalText,
  favoriteQuote: optionalText,
  profilePhotoUrl: optionalText,
  galleryPhotos: z.array(z.string().trim()).optional().default([]),
  lifeEvents: z.array(z.string().trim()).optional().default([]),
  notes: z.array(z.string().trim()).optional().default([]),
  generation: z.number().int().nullable().optional(),
  branchKey: optionalText,
  layoutX: z.number().nullable().optional(),
  layoutY: z.number().nullable().optional(),
  isPrivate: z.boolean().optional().default(true),
});

export const relationshipPayloadSchema = z.object({
  fromPersonId: z.string().trim().min(1),
  toPersonId: z.string().trim().min(1),
  type: z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING", "ADOPTED", "STEP", "FOSTER"]),
  note: optionalText,
});

export const claimProfileSchema = z.object({
  personId: z.string().trim().min(1),
  browserToken: z.string().trim().min(16),
  displayName: optionalText,
});

export const claimRecoverySchema = z.object({
  recoveryCode: z.string().trim().min(7),
  browserToken: z.string().trim().min(16).optional(),
  displayName: optionalText,
});

export const rollbackSchema = z.object({
  historyId: z.string().trim().min(1),
});

export const moderationDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});
