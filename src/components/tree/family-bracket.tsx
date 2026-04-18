"use client";

import { PencilLine, Plus, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  structuralChildren,
  structuralParentId,
  visibleRootPersonIds,
} from "@/lib/shared/bracket-layout";
import { formatDateRange, formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

/** Muted forest green — branch lines */
const branchLine = "bg-[color:rgba(42,74,47,0.28)]";

function lifeStatusDot(person: TreeBundle["people"][number]) {
  switch (person.lifeStatus) {
    case "LIVING":
      return {
        label: "Living",
        dotClass: "bg-[var(--brand-forest)]",
      };
    case "DECEASED":
      return {
        label: "Deceased",
        dotClass: "bg-[var(--ink-muted)]",
      };
    default:
      return {
        label: "Unknown",
        dotClass: "bg-[var(--brand-amber)]",
      };
  }
}

function AddLeaf({
  label,
  onClick,
  narrow,
  caption,
}: {
  label: string;
  onClick: () => void;
  narrow?: boolean;
  caption?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.62)] px-4 py-3 text-[var(--ink-muted)] transition hover:border-[color:rgba(42,74,47,0.35)] hover:bg-[color:rgba(42,74,47,0.06)] hover:text-[var(--brand-forest)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
        narrow ? "min-w-[124px] max-w-[142px]" : "min-w-[170px] max-w-[220px]"
      }`}
    >
      <div className="flex size-8 items-center justify-center rounded-full bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
        <Plus className="size-4 shrink-0" aria-hidden />
      </div>
      <span className="text-center text-sm font-semibold leading-5">
        {caption ?? "Add"}
      </span>
    </button>
  );
}

type FamilyBracketProps = {
  bundle: TreeBundle;
  visiblePersonIds: string[];
  selectedPersonId: string | null;
  canCreatePeople: boolean;
  onSelectPerson: (personId: string) => void;
  onEditPerson: (personId: string) => void;
  onAddPerson: (opts: {
    parentPersonId?: string | null;
    childPersonId?: string | null;
    siblingPersonId?: string | null;
    peerPersonId?: string | null;
  }) => void;
};

function PersonCard({
  person,
  selected,
  canCreatePeople,
  onSelect,
  onEdit,
}: {
  person: TreeBundle["people"][number];
  selected: boolean;
  canCreatePeople: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const status = lifeStatusDot(person);
  return (
    <div
      className={`relative z-[1] min-w-[188px] max-w-[244px] flex-1 rounded-[22px] border px-4 py-4 transition ${
        selected
          ? "border-[color:rgba(42,74,47,0.32)] bg-[color:rgba(42,74,47,0.08)] shadow-[0_14px_34px_rgba(42,74,47,0.12)] ring-1 ring-[color:rgba(42,74,47,0.12)]"
          : "border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.94)] shadow-[0_10px_24px_rgba(47,36,28,0.04)]"
      }`}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${formatPersonName(person)}, ${status.label}${selected ? ", selected" : ""}`}
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 pr-7">
          {selected ? (
            <Badge className="bg-[color:rgba(42,74,47,0.12)] text-[var(--brand-forest)]">
              Selected
            </Badge>
          ) : null}
          {person.claimedBy ? <Badge>Claimed</Badge> : null}
        </div>
        <div className="flex items-start gap-3 pr-7">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
            <User className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-[var(--ink-strong)]">
                {formatPersonName(person)}
              </p>
              <span
                className={`size-2 shrink-0 rounded-full ${status.dotClass}`}
                title={status.label}
              />
            </div>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              {formatDateRange(person.birthDate, person.deathDate) || "Dates unknown"}
            </p>
            {person.currentCity || person.occupation ? (
              <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                {person.currentCity || person.occupation}
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
          Tap this card to work from this person.
        </p>
      </button>
      {canCreatePeople ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="absolute right-2 top-2 rounded-md p-1.5 text-[var(--ink-muted)] transition hover:bg-[color:rgba(0,0,0,0.05)] hover:text-[var(--brand-forest)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          aria-label={`Edit ${formatPersonName(person)}`}
        >
          <PencilLine className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function PersonSubtree({
  bundle,
  personId,
  visible,
  visited,
  selectedPersonId,
  canCreatePeople,
  onSelectPerson,
  onEditPerson,
  onAddPerson,
}: {
  bundle: TreeBundle;
  personId: string;
  visible: Set<string>;
  visited: Set<string>;
  selectedPersonId: string | null;
  canCreatePeople: boolean;
  onSelectPerson: (personId: string) => void;
  onEditPerson: (personId: string) => void;
  onAddPerson: (opts: {
    parentPersonId?: string | null;
    childPersonId?: string | null;
    siblingPersonId?: string | null;
    peerPersonId?: string | null;
  }) => void;
}) {
  if (visited.has(personId)) {
    return null;
  }
  visited.add(personId);

  const person = bundle.people.find((p) => p.id === personId);
  if (!person || !visible.has(personId)) {
    return null;
  }

  const childIds = structuralChildren(bundle, personId)
    .filter((id) => visible.has(id))
    .sort((a, b) =>
      formatPersonName(
        bundle.people.find((p) => p.id === a) ?? { firstName: a },
      ).localeCompare(
        formatPersonName(bundle.people.find((p) => p.id === b) ?? { firstName: b }),
      ),
    );

  const selected = person.id === selectedPersonId;
  const parentId = structuralParentId(bundle, person.id);
  const hasStructuralParent = Boolean(parentId);
  const multiChild = childIds.length > 1;

  return (
    <div className="flex flex-col items-center gap-2">
      <PersonCard
        person={person}
        selected={selected}
        canCreatePeople={canCreatePeople}
        onSelect={() => onSelectPerson(person.id)}
        onEdit={() => onEditPerson(person.id)}
      />

      {canCreatePeople ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!hasStructuralParent ? (
            <AddLeaf
              label={`Add a parent for ${formatPersonName(person)}`}
              caption="Add parent"
              narrow
              onClick={() => onAddPerson({ childPersonId: person.id })}
            />
          ) : null}
          {parentId ? (
            <AddLeaf
              label={`Add a sibling for ${formatPersonName(person)}`}
              caption="Add sibling"
              narrow
              onClick={() =>
                onAddPerson({
                  parentPersonId: parentId,
                  siblingPersonId: person.id,
                })
              }
            />
          ) : (
            <AddLeaf
              label={`Add another top-level person near ${formatPersonName(person)}`}
              caption="New branch"
              onClick={() => onAddPerson({ peerPersonId: person.id })}
            />
          )}
          <AddLeaf
            label={`Add a child for ${formatPersonName(person)}`}
            caption="Add child"
            narrow
            onClick={() => onAddPerson({ parentPersonId: person.id })}
          />
        </div>
      ) : null}

      {childIds.length > 0 ? (
        <div
          className="relative mt-1 flex w-full min-w-0 flex-col items-center"
          role="group"
          aria-label={`Descendants of ${formatPersonName(person)}`}
        >
          {/* Vertical stem from parent row to children */}
          <div
            className={`h-4 w-[2px] shrink-0 rounded-full ${branchLine}`}
            aria-hidden
          />

          <div
            className={`relative flex w-full min-w-[200px] flex-row flex-wrap justify-center gap-x-8 gap-y-10 px-2 pt-0 ${
              multiChild ? "" : "pt-1"
            }`}
          >
            {/* Horizontal bar when multiple siblings (classic family-tree fork) */}
            {multiChild ? (
              <div
                className={`pointer-events-none absolute left-[8%] right-[8%] top-0 z-0 mx-auto h-[2px] max-w-[min(56rem,calc(100%-2rem))] rounded-full ${branchLine} md:left-[12%] md:right-[12%]`}
                aria-hidden
              />
            ) : null}

            {childIds.map((childId) => (
              <div
                key={childId}
                className={`relative z-[1] flex min-w-0 flex-col items-center ${
                  multiChild ? "pt-4" : ""
                }`}
              >
                {multiChild ? (
                  <div
                    className={`absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 rounded-full ${branchLine}`}
                    aria-hidden
                  />
                ) : null}
                <PersonSubtree
                  bundle={bundle}
                  personId={childId}
                  visible={visible}
                  visited={visited}
                  selectedPersonId={selectedPersonId}
                  canCreatePeople={canCreatePeople}
                  onSelectPerson={onSelectPerson}
                  onEditPerson={onEditPerson}
                  onAddPerson={onAddPerson}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FamilyBracket({
  bundle,
  visiblePersonIds,
  selectedPersonId,
  canCreatePeople,
  onSelectPerson,
  onEditPerson,
  onAddPerson,
}: FamilyBracketProps) {
  const visible = new Set(visiblePersonIds);

  if (bundle.people.length === 0) {
    return (
      <div className="flex min-h-[min(60vh,520px)] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.5)] px-6 py-16">
        <p className="text-base font-semibold text-[var(--ink-strong)]">
          {canCreatePeople ? "Start your tree with one person" : "No profiles yet"}
        </p>
        <p className="mt-2 max-w-md text-center text-sm leading-6 text-[var(--ink-muted)]">
          {canCreatePeople
            ? "Press the button below and add the first family member. You only need a first name to begin."
            : "There are no visible profiles in this tree yet."}
        </p>
        {canCreatePeople ? (
          <div className="mt-6">
            <AddLeaf
              label="Add the first person"
              caption="Add first person"
              onClick={() => onAddPerson({})}
            />
          </div>
        ) : null}
      </div>
    );
  }

  let roots = visibleRootPersonIds(bundle, visible).sort((a, b) =>
    formatPersonName(
      bundle.people.find((p) => p.id === a) ?? { firstName: a },
    ).localeCompare(
      formatPersonName(bundle.people.find((p) => p.id === b) ?? { firstName: b }),
    ),
  );

  if (roots.length === 0 && visible.size > 0) {
    roots = [...visiblePersonIds].sort((a, b) =>
      formatPersonName(
        bundle.people.find((p) => p.id === a) ?? { firstName: a },
      ).localeCompare(
        formatPersonName(bundle.people.find((p) => p.id === b) ?? { firstName: b }),
      ),
    );
  }

  if (roots.length === 0 && visiblePersonIds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.5)] px-6 py-10 text-center text-sm text-[var(--ink-muted)]">
        No matches. Clear your search or filters to bring people back into view.
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-auto rounded-[28px] border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.46)] p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-white/72 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">Tree view</p>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            Tap a person card to choose who you are working from. Then use the dashed add cards
            around that person to place relatives in the right spot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Tap card = choose person</Badge>
          <Badge>Dashed card = add relative</Badge>
        </div>
      </div>
      <div className="flex min-h-[min(50vh,560px)] min-w-[min(100%,760px)] flex-col items-center justify-start gap-2">
        <div className="flex flex-row flex-wrap items-start justify-center gap-x-10 gap-y-12 md:gap-x-14">
          {roots.map((rootId) => (
            <PersonSubtree
              key={rootId}
              bundle={bundle}
              personId={rootId}
              visible={visible}
              visited={new Set()}
              selectedPersonId={selectedPersonId}
              canCreatePeople={canCreatePeople}
              onSelectPerson={onSelectPerson}
              onEditPerson={onEditPerson}
              onAddPerson={onAddPerson}
            />
          ))}
          {canCreatePeople ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <AddLeaf
                label="Add another top-level branch"
                caption="New branch"
                onClick={() => onAddPerson({ parentPersonId: null })}
              />
              <span className="max-w-[13rem] text-center text-xs leading-5 text-[var(--ink-muted)]">
                Starts another branch at the top of the tree
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
