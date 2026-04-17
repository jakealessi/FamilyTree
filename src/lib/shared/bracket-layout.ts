import type { TreeBundle } from "@/types/family-tree";

const PARENT_LIKE = new Set(["PARENT", "ADOPTED", "STEP", "FOSTER"]);

function isActiveRelationship(relationship: TreeBundle["relationships"][number]) {
  return relationship.status === "ACTIVE" || relationship.status === "PENDING";
}

/** Parent above child in layout: PARENT-like edges (from → to) or CHILD (child → parent). */
export function structuralParentId(
  bundle: TreeBundle,
  personId: string,
): string | null {
  for (const relationship of bundle.relationships) {
    if (!isActiveRelationship(relationship)) {
      continue;
    }
    if (PARENT_LIKE.has(relationship.type) && relationship.toPersonId === personId) {
      return relationship.fromPersonId;
    }
    if (relationship.type === "CHILD" && relationship.fromPersonId === personId) {
      return relationship.toPersonId;
    }
  }
  return null;
}

export function structuralChildren(bundle: TreeBundle, parentId: string): string[] {
  const out = new Set<string>();
  for (const relationship of bundle.relationships) {
    if (!isActiveRelationship(relationship)) {
      continue;
    }
    if (PARENT_LIKE.has(relationship.type) && relationship.fromPersonId === parentId) {
      out.add(relationship.toPersonId);
    }
    if (relationship.type === "CHILD" && relationship.toPersonId === parentId) {
      out.add(relationship.fromPersonId);
    }
  }
  return [...out];
}

export function visibleRootPersonIds(
  bundle: TreeBundle,
  visible: Set<string>,
): string[] {
  const roots: string[] = [];
  for (const id of visible) {
    const parentId = structuralParentId(bundle, id);
    if (!parentId || !visible.has(parentId)) {
      roots.push(id);
    }
  }
  return roots;
}
