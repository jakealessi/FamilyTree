import { MarkerType, type Edge, type Node } from "@xyflow/react";

import type { TreeBundle, WorkspaceViewMode } from "@/types/family-tree";

import { formatPersonName } from "./utils";

export type PersonNodeData = {
  kind: "person";
  person: TreeBundle["people"][number];
  isSelected: boolean;
  isDimmed: boolean;
  isPending: boolean;
  viewMode: WorkspaceViewMode;
};

export type SilhouetteNodeData = {
  kind: "silhouette";
};

export type FamilyNodeData = PersonNodeData | SilhouetteNodeData;

const BRANCH_COLORS: Record<string, string> = {
  trunk: "#8A5A3C",
  roots: "#6A4A36",
  oak: "#6E8C43",
  blossom: "#C47A8E",
  default: "#7B6F57",
};

const ARTISTIC_NODE_WIDTH = 188;
const ARTISTIC_NODE_HEIGHT = 188;
const ARTISTIC_CENTER_X = 620;
const ARTISTIC_ROOT_Y = 500;
const ARTISTIC_CANOPY_TOP = 108;
const ARTISTIC_SILHOUETTE_WIDTH = 920;
const ARTISTIC_SILHOUETTE_HEIGHT = 560;

function branchColor(branchKey?: string | null) {
  if (!branchKey) {
    return BRANCH_COLORS.default;
  }

  return BRANCH_COLORS[branchKey] ?? BRANCH_COLORS.default;
}

function relationshipColor(
  relationship: TreeBundle["relationships"][number],
  fromBranchKey?: string | null,
  viewMode?: WorkspaceViewMode,
) {
  if (relationship.status === "PENDING") {
    return "#D9964A";
  }

  if (viewMode === "artistic") {
    if (relationship.type === "SPOUSE") {
      return "#C78690";
    }

    if (relationship.type === "SIBLING") {
      return "#8DA06F";
    }

    return "#7B573F";
  }

  return branchColor(fromBranchKey);
}

function stableOffset(seed: string, spread: number) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 33 + character.charCodeAt(0)) % 2147483647;
  }

  const range = spread * 2 + 1;
  return (hash % range) - spread;
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

function buildPersonNodeData(
  person: TreeBundle["people"][number],
  bundle: TreeBundle,
  loweredQuery: string,
  selectedPersonId: string | null,
  viewMode: WorkspaceViewMode,
): PersonNodeData {
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

  return {
    kind: "person",
    person,
    isSelected: person.id === selectedPersonId,
    isDimmed: !matchesQuery,
    isPending: bundle.relationships.some(
      (relationship) =>
        relationship.status === "PENDING" &&
        (relationship.fromPersonId === person.id || relationship.toPersonId === person.id),
    ),
    viewMode,
  };
}

function buildClassicNodes(
  bundle: TreeBundle,
  peopleByGeneration: Map<number, TreeBundle["people"]>,
  sortedGenerations: number[],
  loweredQuery: string,
  selectedPersonId: string | null,
) {
  const nodes: Array<Node<FamilyNodeData>> = [];

  for (const generation of sortedGenerations) {
    const people = (peopleByGeneration.get(generation) ?? []).sort((left, right) =>
      formatPersonName(left).localeCompare(formatPersonName(right)),
    );

    people.forEach((person, index) => {
      nodes.push({
        id: person.id,
        type: "classic",
        draggable: false,
        selectable: true,
        position: {
          x: person.layoutX ?? index * 240 + 80,
          y: person.layoutY ?? generation * 220 + 80,
        },
        data: buildPersonNodeData(
          person,
          bundle,
          loweredQuery,
          selectedPersonId,
          "classic",
        ),
        style: {
          borderColor: branchColor(person.branchKey),
        },
        zIndex: 2,
      });
    });
  }

  return nodes;
}

function buildArtisticNodes(
  bundle: TreeBundle,
  peopleByGeneration: Map<number, TreeBundle["people"]>,
  sortedGenerations: number[],
  loweredQuery: string,
  selectedPersonId: string | null,
) {
  const nodes: Array<Node<FamilyNodeData>> = [
    {
      id: "__tree_silhouette__",
      type: "silhouette",
      draggable: false,
      selectable: false,
      focusable: false,
      position: {
        x: ARTISTIC_CENTER_X - ARTISTIC_SILHOUETTE_WIDTH / 2,
        y: 26,
      },
      data: {
        kind: "silhouette",
      },
      style: {
        width: ARTISTIC_SILHOUETTE_WIDTH,
        height: ARTISTIC_SILHOUETTE_HEIGHT,
        border: "none",
        background: "transparent",
      },
      zIndex: 0,
    },
  ];

  const minGeneration = sortedGenerations[0] ?? 0;
  const maxGeneration = sortedGenerations[sortedGenerations.length - 1] ?? minGeneration;
  const generationSpan = Math.max(1, maxGeneration - minGeneration);

  for (const generation of sortedGenerations) {
    const people = (peopleByGeneration.get(generation) ?? []).sort((left, right) =>
      `${left.branchKey ?? ""}${formatPersonName(left)}`.localeCompare(
        `${right.branchKey ?? ""}${formatPersonName(right)}`,
      ),
    );

    const depthRatio =
      sortedGenerations.length === 1 ? 0.58 : (generation - minGeneration) / generationSpan;
    const rowY =
      ARTISTIC_ROOT_Y - depthRatio * (ARTISTIC_ROOT_Y - ARTISTIC_CANOPY_TOP);
    const spread =
      130 + depthRatio * 340 + Math.max(0, people.length - 2) * 34;

    people.forEach((person, index) => {
      const slot =
        people.length === 1 ? 0 : (index / Math.max(1, people.length - 1)) * 2 - 1;
      const branchDrift = stableOffset(person.branchKey ?? person.id, 22);
      const sway = stableOffset(`${person.id}-x`, 26);
      const canopyDip = Math.abs(slot) * 56 + stableOffset(`${person.id}-y`, 16);
      const computedX =
        ARTISTIC_CENTER_X +
        slot * spread +
        branchDrift +
        sway -
        ARTISTIC_NODE_WIDTH / 2;
      const computedY = rowY + canopyDip - ARTISTIC_NODE_HEIGHT / 2;

      nodes.push({
        id: person.id,
        type: "canopy",
        draggable: false,
        selectable: true,
        position: {
          x: person.layoutX ?? computedX,
          y: person.layoutY ?? computedY,
        },
        data: buildPersonNodeData(
          person,
          bundle,
          loweredQuery,
          selectedPersonId,
          "artistic",
        ),
        style: {
          borderColor: branchColor(person.branchKey),
        },
        zIndex: 2,
      });
    });
  }

  return nodes;
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

  const nodes =
    viewMode === "artistic"
      ? buildArtisticNodes(
          bundle,
          peopleByGeneration,
          sortedGenerations,
          loweredQuery,
          selectedPersonId,
        )
      : buildClassicNodes(
          bundle,
          peopleByGeneration,
          sortedGenerations,
          loweredQuery,
          selectedPersonId,
        );

  const peopleById = new Map(bundle.people.map((person) => [person.id, person]));

  const edges: Edge[] = bundle.relationships.map((relationship) => {
    const isDirectional =
      relationship.type === "PARENT" ||
      relationship.type === "ADOPTED" ||
      relationship.type === "STEP" ||
      relationship.type === "FOSTER" ||
      relationship.type === "CHILD";
    const fromPerson = peopleById.get(relationship.fromPersonId);
    const color = relationshipColor(relationship, fromPerson?.branchKey, viewMode);
    const isArtistic = viewMode === "artistic";

    return {
      id: relationship.id,
      source: relationship.fromPersonId,
      target: relationship.toPersonId,
      label: isArtistic ? undefined : edgeLabel(relationship.type),
      type: isArtistic ? "simplebezier" : "straight",
      style: {
        stroke: color,
        strokeWidth: isArtistic
          ? relationship.type === "SPOUSE"
            ? 2.6
            : 3.6
          : relationship.type === "SPOUSE"
            ? 3
            : 2,
        strokeLinecap: "round",
        strokeDasharray:
          relationship.status === "PENDING"
            ? "6 6"
            : relationship.type === "FOSTER"
              ? "7 5"
              : relationship.type === "SPOUSE" && isArtistic
                ? "3 8"
                : "none",
      },
      animated: isArtistic && relationship.status === "PENDING",
      markerEnd: !isArtistic && isDirectional
        ? {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color,
          }
        : undefined,
    };
  });

  return { nodes, edges };
}
