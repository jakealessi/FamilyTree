"use client";

import { User } from "lucide-react";

import { deriveGenerations } from "@/lib/shared/generations";
import { formatDateRange, formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

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

type FamilyBracketProps = {
  bundle: TreeBundle;
  visiblePersonIds: string[];
  selectedPersonId: string | null;
  canCreatePeople: boolean;
  onSelectPerson: (personId: string) => void;
};

export function FamilyBracket({
  bundle,
  visiblePersonIds,
  selectedPersonId,
  canCreatePeople,
  onSelectPerson,
}: FamilyBracketProps) {
  const visible = new Set(visiblePersonIds);
  const generations = deriveGenerations(bundle);
  const peopleByGeneration = new Map<number, TreeBundle["people"]>();

  for (const person of bundle.people) {
    if (!visible.has(person.id)) {
      continue;
    }
    const gen = generations.get(person.id) ?? 0;
    const list = peopleByGeneration.get(gen) ?? [];
    list.push(person);
    peopleByGeneration.set(gen, list);
  }

  const sortedGens = [...peopleByGeneration.keys()].sort((a, b) => a - b);

  if (bundle.people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.5)] px-6 py-16 text-center">
        <p className="text-lg font-semibold text-[var(--ink-strong)]">Start your tree</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--ink-muted)]">
          {canCreatePeople
            ? "Use “Add person” above to create the first profile. Then connect relatives with the relationship form below."
            : "This tree is empty. Open it with edit access to add people."}
        </p>
      </div>
    );
  }

  if (sortedGens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.5)] px-6 py-10 text-center text-sm text-[var(--ink-muted)]">
        No people match the current filters. Clear filters or search to see the tree.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.45)] p-4">
      <div className="flex min-w-[min(100%,720px)] flex-col gap-0">
        {sortedGens.map((gen, index) => {
          const people = (peopleByGeneration.get(gen) ?? []).sort((a, b) =>
            formatPersonName(a).localeCompare(formatPersonName(b)),
          );

          return (
            <div key={gen}>
              {index > 0 ? (
                <div className="flex justify-center py-2" aria-hidden>
                  <div className="h-6 w-px bg-[color:var(--border-soft)]" />
                </div>
              ) : null}
              <div className="flex flex-wrap items-stretch justify-center gap-3">
                {people.map((person) => {
                  const selected = person.id === selectedPersonId;
                  const status = lifeStatusDot(person);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${formatPersonName(person)}, ${status.label}${selected ? ", selected" : ""}`}
                      onClick={() => onSelectPerson(person.id)}
                      className={`min-w-[160px] max-w-[220px] flex-1 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 ${
                        selected
                          ? "border-[color:var(--brand-forest)] bg-[color:rgba(42,74,47,0.08)] shadow-sm ring-1 ring-[color:rgba(42,74,47,0.2)]"
                          : "border-[color:var(--border-soft)] bg-white hover:bg-[color:rgba(255,255,255,0.95)]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
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
                            <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                              {person.currentCity}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                <span className="h-px w-8 bg-[color:var(--border-soft)]" aria-hidden />
                <span>Generation {gen}</span>
                <span className="h-px w-8 bg-[color:var(--border-soft)]" aria-hidden />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
