import { MarkerType, type Edge, type Node } from "@xyflow/react";

import type { TreeBundle, WorkspaceViewMode } from "@/types/family-tree";

import { formatPersonName } from "./utils";

export type FamilyNodeData = {
  person: TreeBundle["people"][number];
  isSelected: boolean;
  isDimmed: boolean;
  isPending: boolean;
  viewMode: WorkspaceViewMode;
};

const BRANCH_COLORS: Record<string, string> = {
  trunk: "#8A5A3C",
  roots: "#6A4A36",
  oak: "#6E8C43",
  blossom: "#C47A8E",
  default: "#7B6F57",
};

function branchColor(branchKey?: string | null) {
  if (!branchKey) {
    return BRANCH_COLORS.default;
  }

  return BRANCH_COLORS[branchKey] ?? BRANCH_COLORS.default;
}

function deriveGenerations(bundle: TreeBundle) {
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

      if (relationship.type === "PARENT" || relationship.type === "ADOPTED" || relationship.type === "STEP" || relationship.type === "FOSTER") {
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

function edgeLabel(type: string) {
  return type.toLowerCase().replace(/_/g, " ");
}

export function buildFamilyGraph(
  bundle: TreeBundle,
  viewMode: WorkspaceViewMode,
  searchQuery: string,
  selectedPersonId: string | null,
) {
  const generations = deriveGenerations(bundle);
  const loweredQuery = searchQuery.trim().toLowerCase();

  const peopleByGeneration = new Map<number, TreeBundle["people"]>();
  for (const person of bundle.people) {
    const generation = generations.get(person.id) ?? 0;
    const list = peopleByGeneration.get(generation) ?? [];
    list.push(person);
    peopleByGeneration.set(generation, list);
  }

  const sortedGenerations = [...peopleByGeneration.keys()].sort((left, right) => left - right);

  const nodes: Array<Node<FamilyNodeData>> = [];
  for (const generation of sortedGenerations) {
    const people = (peopleByGeneration.get(generation) ?? []).sort((left, right) =>
      formatPersonName(left).localeCompare(formatPersonName(right)),
    );

    people.forEach((person, index) => {
      const haystack = [
        formatPersonName(person),
        person.currentCity,
        person.birthplace,
        person.occupation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = loweredQuery.length === 0 || haystack.includes(loweredQuery);
      nodes.push({
        id: person.id,
        type: viewMode === "artistic" ? "canopy" : "classic",
        draggable: false,
        selectable: true,
        position: {
          x: person.layoutX ?? index * 240 + 80,
          y: person.layoutY ?? generation * 220 + 80,
        },
        data: {
          person,
          isSelected: person.id === selectedPersonId,
          isDimmed: !matchesQuery,
          isPending: bundle.relationships.some(
            (relationship) =>
              relationship.status === "PENDING" &&
              (relationship.fromPersonId === person.id || relationship.toPersonId === person.id),
          ),
          viewMode,
        },
        style: {
          borderColor: branchColor(person.branchKey),
        },
      });
    });
  }

  const edges: Edge[] = bundle.relationships.map((relationship) => {
    const isDirectional =
      relationship.type === "PARENT" ||
      relationship.type === "ADOPTED" ||
      relationship.type === "STEP" ||
      relationship.type === "FOSTER" ||
      relationship.type === "CHILD";

    return {
      id: relationship.id,
      source: relationship.fromPersonId,
      target: relationship.toPersonId,
      label: edgeLabel(relationship.type),
      type: viewMode === "artistic" ? "smoothstep" : "straight",
      style: {
        stroke:
          relationship.status === "PENDING"
            ? "#D9964A"
            : branchColor(
                bundle.people.find((person) => person.id === relationship.fromPersonId)
                  ?.branchKey,
              ),
        strokeWidth: relationship.type === "SPOUSE" ? 3 : 2,
        strokeDasharray:
          relationship.status === "PENDING" || relationship.type === "FOSTER" ? "6 4" : "none",
      },
      markerEnd: isDirectional
        ? {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color:
              relationship.status === "PENDING"
                ? "#D9964A"
                : branchColor(
                    bundle.people.find((person) => person.id === relationship.fromPersonId)
                      ?.branchKey,
                  ),
          }
        : undefined,
    };
  });

  return { nodes, edges };
}
