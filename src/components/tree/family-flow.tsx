"use client";
/* eslint-disable @next/next/no-img-element */

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Heart, MapPin, Sprout, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buildFamilyGraph, type FamilyNodeData } from "@/lib/shared/graph";
import { formatDateRange, formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle, WorkspaceViewMode } from "@/types/family-tree";

type CanopyFlowNode = Node<FamilyNodeData, "canopy">;
type ClassicFlowNode = Node<FamilyNodeData, "classic">;

function CanopyNode({ data }: NodeProps<CanopyFlowNode>) {
  const person = data.person;

  return (
    <button
      type="button"
      className={`group relative w-52 text-left transition ${data.isDimmed ? "opacity-35" : "opacity-100"}`}
    >
      <div
        className={`rounded-[34px] border bg-[radial-gradient(circle_at_top,_rgba(241,233,203,0.95),_rgba(255,255,255,0.92)_60%,_rgba(244,239,228,0.96))] p-4 shadow-[0_28px_60px_-32px_rgba(60,41,24,0.65)] ${
          data.isSelected
            ? "border-[color:var(--brand-amber)] ring-2 ring-[color:rgba(227,182,97,0.35)]"
            : "border-[color:rgba(123,111,87,0.18)]"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[color:rgba(110,140,67,0.12)] text-[var(--brand-forest)]">
            {person.profilePhotoUrl ? (
              <img
                src={person.profilePhotoUrl}
                alt={formatPersonName(person)}
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <Sprout className="size-5" />
            )}
          </span>
          {data.isPending ? (
            <Badge className="bg-[color:rgba(227,182,97,0.18)] text-[#8D642A]">Pending</Badge>
          ) : null}
        </div>

        <div className="space-y-1">
          <p className="text-lg font-semibold text-[var(--ink-strong)]">
            {formatPersonName(person)}
          </p>
          <p className="text-sm text-[var(--ink-muted)]">{formatDateRange(person.birthDate, person.deathDate)}</p>
        </div>

        <div className="mt-3 space-y-1 text-xs text-[var(--ink-muted)]">
          {person.currentCity ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {person.currentCity}
            </p>
          ) : null}
          {person.occupation ? (
            <p className="flex items-center gap-1.5">
              <Star className="size-3.5" />
              {person.occupation}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ClassicNode({ data }: NodeProps<ClassicFlowNode>) {
  const person = data.person;

  return (
    <button
      type="button"
      className={`w-64 rounded-3xl border bg-white/95 p-4 text-left shadow-[0_22px_55px_-34px_rgba(65,45,25,0.45)] transition ${
        data.isSelected
          ? "border-[color:var(--brand-forest)] ring-2 ring-[color:rgba(42,74,47,0.18)]"
          : "border-[color:var(--border-soft)]"
      } ${data.isDimmed ? "opacity-35" : "opacity-100"}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--ink-strong)]">
            {formatPersonName(person)}
          </p>
          <p className="text-sm text-[var(--ink-muted)]">
            {formatDateRange(person.birthDate, person.deathDate)}
          </p>
        </div>
        {person.claimedBy ? (
          <Badge className="bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
            Claimed
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1 text-sm text-[var(--ink-soft)]">
        {person.currentCity ? <p>{person.currentCity}</p> : null}
        {person.occupation ? <p>{person.occupation}</p> : null}
        {person.lifeStatus === "DECEASED" ? (
          <p className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
            <Heart className="size-3.5" />
            Remembered
          </p>
        ) : null}
      </div>
    </button>
  );
}

const nodeTypes = {
  canopy: CanopyNode,
  classic: ClassicNode,
};

type FamilyFlowProps = {
  bundle: TreeBundle;
  viewMode: WorkspaceViewMode;
  searchQuery: string;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
};

export function FamilyFlow({
  bundle,
  viewMode,
  searchQuery,
  selectedPersonId,
  onSelectPerson,
}: FamilyFlowProps) {
  const { nodes, edges } = buildFamilyGraph(bundle, viewMode, searchQuery, selectedPersonId);

  return (
    <div
      className={`relative h-[560px] overflow-hidden rounded-[34px] border border-[color:var(--border-soft)] ${
        viewMode === "artistic"
          ? "bg-[radial-gradient(circle_at_top,_rgba(237,223,183,0.55),_rgba(248,244,237,0.82)_55%,_rgba(245,240,231,0.92))]"
          : "bg-[linear-gradient(180deg,_rgba(251,249,244,0.97),_rgba(243,239,232,0.98))]"
      }`}
    >
      {viewMode === "artistic" ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-10 h-[460px] w-7 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#6E4A34,#8C6543)] opacity-80" />
          <div className="absolute left-[18%] top-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(155,188,112,0.25),_transparent_68%)]" />
          <div className="absolute right-[12%] top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(143,171,95,0.24),_transparent_68%)]" />
          <div className="absolute bottom-0 left-0 h-28 w-full bg-[linear-gradient(180deg,transparent,rgba(120,86,55,0.08))]" />
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        onNodeClick={(_, node) => onSelectPerson(node.id)}
        panOnDrag
        zoomOnScroll
        className="family-flow"
      >
        <MiniMap
          pannable
          zoomable
          className="!rounded-2xl !border !border-[color:var(--border-soft)] !bg-white/90"
          nodeColor={(node) => (node.type === "canopy" ? "#7A9B54" : "#C08F4D")}
        />
        <Controls className="!rounded-2xl !border !border-[color:var(--border-soft)] !bg-white/90 !shadow-none" />
        <Background
          color={viewMode === "artistic" ? "#DAD1BE" : "#D9D3C8"}
          gap={22}
          size={0.8}
        />
      </ReactFlow>
    </div>
  );
}
