"use client";
/* eslint-disable @next/next/no-img-element */

import "@xyflow/react/dist/style.css";

import {
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Heart, MapPin, Sprout, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  buildFamilyGraph,
  type PersonNodeData,
} from "@/lib/shared/graph";
import { formatDateRange, formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle, WorkspaceViewMode } from "@/types/family-tree";

type CanopyFlowNode = Node<PersonNodeData, "canopy">;
type ClassicFlowNode = Node<PersonNodeData, "classic">;

function SilhouetteNode() {
  return (
    <div aria-hidden className="pointer-events-none relative h-[560px] w-[920px]">
      <div className="absolute inset-x-[105px] top-3 h-[248px] rounded-[50%] bg-[radial-gradient(circle_at_50%_48%,rgba(159,188,114,0.4),rgba(118,150,81,0.28)_44%,rgba(88,122,64,0.18)_65%,transparent_76%)] blur-[1px]" />
      <div className="absolute left-1/2 top-16 h-[210px] w-[580px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle_at_50%_50%,rgba(231,206,140,0.13),transparent_72%)]" />
      <div className="absolute left-1/2 top-[176px] h-[244px] w-[92px] -translate-x-1/2 rounded-t-[56px] rounded-b-[34px] bg-[linear-gradient(180deg,#9a6f4c_0%,#7d563e_38%,#6a4936_68%,#53392b_100%)] shadow-[0_32px_70px_-34px_rgba(79,53,36,0.8)]" />
      <div className="absolute left-1/2 top-[332px] h-[146px] w-[336px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(92,64,44,0.22),transparent_70%)] blur-xl" />

      <span className="absolute left-[48.7%] top-[178px] h-4 w-[230px] origin-left -rotate-[24deg] rounded-full bg-[linear-gradient(90deg,#6c4935,#8d6547)] opacity-95" />
      <span className="absolute left-[50.1%] top-[194px] h-4 w-[262px] origin-left rotate-[22deg] rounded-full bg-[linear-gradient(90deg,#6b4835,#8b6447)] opacity-95" />
      <span className="absolute right-[49.3%] top-[196px] h-4 w-[242px] origin-right -rotate-[21deg] rounded-full bg-[linear-gradient(90deg,#8e6748,#6d4b37)] opacity-95" />
      <span className="absolute right-[50.5%] top-[222px] h-4 w-[208px] origin-right rotate-[18deg] rounded-full bg-[linear-gradient(90deg,#8d6647,#6b4936)] opacity-95" />
      <span className="absolute left-[49.8%] top-[236px] h-3.5 w-[168px] origin-left -rotate-[42deg] rounded-full bg-[linear-gradient(90deg,#6d4a36,#8a6346)] opacity-90" />
      <span className="absolute right-[50.3%] top-[244px] h-3.5 w-[156px] origin-right rotate-[40deg] rounded-full bg-[linear-gradient(90deg,#8a6346,#6d4a36)] opacity-90" />

      <span className="absolute left-1/2 top-[390px] h-3.5 w-[142px] origin-left rotate-[148deg] rounded-full bg-[linear-gradient(90deg,#6f4c38,#886144)] opacity-85" />
      <span className="absolute left-1/2 top-[410px] h-3.5 w-[168px] origin-left rotate-[166deg] rounded-full bg-[linear-gradient(90deg,#6f4c38,#886144)] opacity-85" />
      <span className="absolute right-1/2 top-[390px] h-3.5 w-[146px] origin-right -rotate-[148deg] rounded-full bg-[linear-gradient(90deg,#886144,#6f4c38)] opacity-85" />
      <span className="absolute right-1/2 top-[412px] h-3.5 w-[172px] origin-right -rotate-[165deg] rounded-full bg-[linear-gradient(90deg,#886144,#6f4c38)] opacity-85" />

      <div className="absolute inset-x-[150px] top-[92px] h-[182px] rounded-[50%] border border-[rgba(255,255,255,0.22)] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.12),transparent_48%)]" />
      <div className="absolute left-[156px] top-[116px] size-4 rounded-full bg-[rgba(237,197,104,0.5)] blur-[1px]" />
      <div className="absolute left-[232px] top-[146px] size-3 rounded-full bg-[rgba(198,122,142,0.38)]" />
      <div className="absolute right-[206px] top-[126px] size-4 rounded-full bg-[rgba(237,197,104,0.45)] blur-[1px]" />
      <div className="absolute right-[276px] top-[164px] size-3 rounded-full bg-[rgba(198,122,142,0.36)]" />
    </div>
  );
}

function CanopyNode({ data }: NodeProps<CanopyFlowNode>) {
  const person = data.person;
  const isClaimed = Boolean(person.claimedBy);
  const isRemembered = person.lifeStatus === "DECEASED";

  const shellTone = isRemembered
    ? "border-[rgba(126,83,45,0.26)] bg-[radial-gradient(circle_at_30%_22%,rgba(249,227,165,0.98),rgba(205,144,71,0.96)_66%,rgba(142,87,49,0.95))] shadow-[0_30px_70px_-34px_rgba(147,95,53,0.72)]"
    : isClaimed
      ? "border-[rgba(163,96,118,0.22)] bg-[radial-gradient(circle_at_28%_18%,rgba(252,226,232,0.98),rgba(221,157,174,0.95)_64%,rgba(181,104,128,0.92))] shadow-[0_30px_70px_-34px_rgba(170,108,132,0.62)]"
      : "border-[rgba(93,121,59,0.22)] bg-[radial-gradient(circle_at_28%_18%,rgba(232,246,206,0.98),rgba(135,171,86,0.96)_64%,rgba(88,123,56,0.94))] shadow-[0_30px_70px_-34px_rgba(92,126,63,0.66)]";

  const plaqueTone = isRemembered
    ? "border-[rgba(119,82,52,0.18)] bg-[linear-gradient(180deg,rgba(250,242,224,0.96),rgba(237,221,192,0.96))]"
    : isClaimed
      ? "border-[rgba(144,94,112,0.16)] bg-[linear-gradient(180deg,rgba(255,249,251,0.97),rgba(247,231,236,0.96))]"
      : "border-[rgba(103,90,60,0.16)] bg-[linear-gradient(180deg,rgba(255,252,247,0.97),rgba(243,237,225,0.96))]";

  return (
    <button
      type="button"
      className={`group relative w-[188px] text-left transition duration-300 ${
        data.isDimmed ? "opacity-30" : "opacity-100"
      }`}
    >
      <div className="pointer-events-none absolute left-1/2 top-[114px] h-[58px] w-2 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#7a593f,#53392b)] opacity-95" />

      <div
        className={`relative rounded-[42%_58%_52%_48%/50%_42%_58%_50%] border px-4 pb-5 pt-4 text-[#20301f] transition-transform duration-300 group-hover:-translate-y-1 ${shellTone} ${
          data.isSelected
            ? "ring-4 ring-[rgba(232,204,126,0.34)]"
            : "ring-0"
        }`}
      >
        <div className="absolute right-3 top-3 flex gap-1.5">
          {data.isPending ? (
            <Badge className="border border-[rgba(125,89,44,0.16)] bg-[rgba(255,247,226,0.9)] text-[#8B642E]">
              Budding
            </Badge>
          ) : null}
          {isClaimed ? (
            <Badge className="border border-[rgba(155,98,118,0.14)] bg-[rgba(255,247,250,0.9)] text-[#9C5F70]">
              Claimed
            </Badge>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex size-14 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            {person.profilePhotoUrl ? (
              <img
                src={person.profilePhotoUrl}
                alt={formatPersonName(person)}
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <Sprout className="size-6 text-white/90" />
            )}
          </div>

          {isRemembered ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(79,49,29,0.14)] px-2.5 py-1 text-[11px] font-medium text-[#5E3924]">
              <Heart className="size-3.5" />
              Remembered
            </span>
          ) : null}
        </div>

        <div className="mt-5 space-y-2 text-white">
          <p className="text-lg font-semibold leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.16)]">
            {formatPersonName(person)}
          </p>
          <p className="text-sm text-white/86">
            {formatDateRange(person.birthDate, person.deathDate)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/88">
          {person.currentCity ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-1">
              <MapPin className="size-3.5" />
              {person.currentCity}
            </span>
          ) : null}
          {person.occupation ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-1">
              <Star className="size-3.5" />
              {person.occupation}
            </span>
          ) : null}
        </div>

        <span className="pointer-events-none absolute bottom-4 right-5 size-6 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38),transparent_72%)]" />
        <span className="pointer-events-none absolute left-5 top-5 size-8 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_72%)]" />
      </div>

      <div
        className={`relative mx-auto mt-[-10px] w-[154px] rounded-[24px] border px-4 py-3 shadow-[0_22px_45px_-30px_rgba(55,39,28,0.7)] ${plaqueTone}`}
      >
        <p className="text-sm font-semibold text-[var(--ink-strong)]">
          {person.nickname ? `“${person.nickname}”` : person.birthplace ?? "Family branch"}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {person.education ?? person.hobbies ?? person.favoriteQuote ?? "Leaf in the family canopy"}
        </p>
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
  silhouette: SilhouetteNode,
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
  const isArtistic = viewMode === "artistic";

  return (
    <div
      className={`relative h-[560px] overflow-hidden rounded-[34px] border border-[color:var(--border-soft)] ${
        isArtistic
          ? "bg-[linear-gradient(180deg,rgba(248,241,224,0.98),rgba(244,236,220,0.96)_42%,rgba(233,223,204,0.96)_72%,rgba(225,212,190,0.98))]"
          : "bg-[linear-gradient(180deg,_rgba(251,249,244,0.97),_rgba(243,239,232,0.98))]"
      }`}
    >
      {isArtistic ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[8%] top-[-6%] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(240,215,147,0.36),transparent_70%)] blur-xl" />
          <div className="absolute right-[10%] top-[6%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(162,191,116,0.24),transparent_72%)] blur-xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(115,85,58,0.12))]" />
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: isArtistic ? 0.08 : 0.18 }}
        onNodeClick={(_, node) => {
          if (node.type !== "silhouette") {
            onSelectPerson(node.id);
          }
        }}
        panOnDrag
        zoomOnScroll
        className={`family-flow ${isArtistic ? "family-flow--artistic" : "family-flow--classic"}`}
      >
        {!isArtistic ? (
          <MiniMap
            pannable
            zoomable
            className="!rounded-2xl !border !border-[color:var(--border-soft)] !bg-white/90"
            nodeColor={(node) => (node.type === "canopy" ? "#7A9B54" : "#C08F4D")}
          />
        ) : null}
        <Controls className="!rounded-2xl !border !border-[color:var(--border-soft)] !bg-white/90 !shadow-none" />
      </ReactFlow>
    </div>
  );
}
