import type { TreeBundle } from "@/types/family-tree";

export function deriveGenerations(bundle: TreeBundle) {
  const generations = new Map<string, number>();

  for (const person of bundle.people) {
    if (typeof person.generation === "number") {
      generations.set(person.id, person.generation);
    }
  }

  for (let pass = 0; pass < bundle.people.length; pass += 1) {
    for (const relationship of bundle.relationships) {
      const fromGeneration = generations.get(relationship.fromPersonId);
      const toGeneration = generations.get(relationship.toPersonId);

      if (
        relationship.type === "PARENT" ||
        relationship.type === "ADOPTED" ||
        relationship.type === "STEP" ||
        relationship.type === "FOSTER"
      ) {
        if (fromGeneration !== undefined && toGeneration === undefined) {
          generations.set(relationship.toPersonId, fromGeneration + 1);
        }
        if (toGeneration !== undefined && fromGeneration === undefined) {
          generations.set(relationship.fromPersonId, toGeneration - 1);
        }
      }

      if (relationship.type === "CHILD") {
        if (fromGeneration !== undefined && toGeneration === undefined) {
          generations.set(relationship.toPersonId, fromGeneration - 1);
        }
        if (toGeneration !== undefined && fromGeneration === undefined) {
          generations.set(relationship.fromPersonId, toGeneration + 1);
        }
      }

      if (relationship.type === "SPOUSE" || relationship.type === "SIBLING") {
        if (fromGeneration !== undefined && toGeneration === undefined) {
          generations.set(relationship.toPersonId, fromGeneration);
        }
        if (toGeneration !== undefined && fromGeneration === undefined) {
          generations.set(relationship.fromPersonId, toGeneration);
        }
      }
    }
  }

  return generations;
}
