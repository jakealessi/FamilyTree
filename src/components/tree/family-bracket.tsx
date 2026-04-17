"use client";

import { PencilLine, Plus, User } from "lucide-react";

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
      className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.35)] px-3 py-2 text-[var(--ink-muted)] transition hover:border-[color:rgba(42,74,47,0.35)] hover:bg-[color:rgba(42,74,47,0.06)] hover:text-[var(--brand-forest)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
        narrow ? "min-w-[100px] max-w-[120px]" : "min-w-[140px] max-w-[200px]"
      }`}
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      <span className="text-center text-[11px] font-semibold uppercase tracking-[0.1em]">
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
      className={`relative z-[1] min-w-[160px] max-w-[220px] flex-1 rounded-xl border px-3 py-3 transition ${
        selected
          ? "border-[color:var(--brand-forest)] bg-[color:rgba(42,74,47,0.08)] shadow-sm ring-1 ring-[color:rgba(42,74,47,0.2)]"
          : "border-[color:var(--border-soft)] bg-white"
      }`}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${formatPersonName(person)}, ${status.label}${selected ? ", selected" : ""}`}
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start gap-2 pr-7">
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
            {person.currentCity ? (
              <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">{person.currentCity}</p>
            ) : null}
          </div>
        </div>
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
  const hasStructuralParent = Boolean(structuralParentId(bundle, person.id));
  const multiChild = childIds.length > 1;

  return (
    <div className="flex flex-col items-center gap-2">
      {canCreatePeople && !hasStructuralParent ? (
        <AddLeaf
          label={`Add someone above ${formatPersonName(person)}`}
          caption="Above"
          narrow
          onClick={() =>
            onAddPerson({ parentPersonId: null, childPersonId: person.id })
          }
        />
      ) : null}

      <PersonCard
        person={person}
        selected={selected}
        canCreatePeople={canCreatePeople}
        onSelect={() => onSelectPerson(person.id)}
        onEdit={() => onEditPerson(person.id)}
      />

      {canCreatePeople ? (
        <AddLeaf
          label={`Add a child under ${formatPersonName(person)}`}
          caption="Below"
          narrow
          onClick={() => onAddPerson({ parentPersonId: person.id, childPersonId: null })}
        />
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
        <p className="text-sm font-medium text-[var(--ink-muted)]">
          {canCreatePeople ? "Start your tree" : "No profiles yet"}
        </p>
        {canCreatePeople ? (
          <div className="mt-6">
            <AddLeaf label="Add the first person" onClick={() => onAddPerson({})} />
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
        No matches
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.45)] p-4 md:p-6">
      <div className="flex min-h-[min(50vh,560px)] min-w-[min(100%,720px)] flex-col items-center justify-start gap-2">
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
                label="Add another root or branch"
                onClick={() => onAddPerson({ parentPersonId: null })}
              />
              <span className="max-w-[12rem] text-center text-[10px] text-[var(--ink-muted)]">
                Same row as others with no parent link yet
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
