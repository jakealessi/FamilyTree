import { AccessRole, ModerationMode } from "@prisma/client";

export function canView(role: AccessRole | null) {
  return role !== null;
}

export function canEditTree(role: AccessRole | null) {
  return role === AccessRole.OWNER || role === AccessRole.CONTRIBUTOR;
}

export function canCreatePeople(role: AccessRole | null) {
  return role === AccessRole.OWNER || role === AccessRole.CONTRIBUTOR;
}

export function canEditPerson(
  role: AccessRole | null,
  personId: string,
  claimedPersonId?: string | null,
) {
  if (role === AccessRole.OWNER || role === AccessRole.CONTRIBUTOR) {
    return true;
  }

  if (role === AccessRole.PERSONAL) {
    return claimedPersonId === personId;
  }

  return false;
}

export function canDeletePerson(role: AccessRole | null) {
  return role === AccessRole.OWNER || role === AccessRole.CONTRIBUTOR;
}

export function canEditRelationships(role: AccessRole | null) {
  return role === AccessRole.OWNER || role === AccessRole.CONTRIBUTOR;
}

export function canModerate(role: AccessRole | null) {
  return role === AccessRole.OWNER;
}

export function canRollback(role: AccessRole | null) {
  return role === AccessRole.OWNER;
}

export function needsStructuralModeration(
  moderationMode: ModerationMode,
  role: AccessRole | null,
) {
  return moderationMode === ModerationMode.REVIEW_STRUCTURE && role === AccessRole.CONTRIBUTOR;
}
