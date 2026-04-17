/** OR clauses for Prisma findFirst when checking duplicate structural relationships. */
export function duplicateRelationshipFilters(
  fromPersonId: string,
  toPersonId: string,
  type: string,
) {
  const filters: Array<Record<string, string>> = [
    { fromPersonId, toPersonId, type },
  ];

  if (type === "SPOUSE" || type === "SIBLING") {
    filters.push({
      fromPersonId: toPersonId,
      toPersonId: fromPersonId,
      type,
    });
  }

  if (type === "PARENT") {
    filters.push({
      fromPersonId: toPersonId,
      toPersonId: fromPersonId,
      type: "CHILD",
    });
  }

  if (type === "CHILD") {
    filters.push({
      fromPersonId: toPersonId,
      toPersonId: fromPersonId,
      type: "PARENT",
    });
  }

  return filters;
}
