import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeOptionalText(value?: string | null) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

export function toOptionalDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toStringArray(values?: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function linesToArray(value?: string | null) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function arrayToLines(values?: unknown) {
  return toStringArray(values).join("\n");
}

export function formatDateLabel(value?: string | Date | null) {
  if (!value) {
    return "Unknown";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return format(parsed, "MMM d, yyyy");
}

export function formatDateRange(
  birthDate?: string | Date | null,
  deathDate?: string | Date | null,
) {
  const birth = birthDate ? formatDateLabel(birthDate) : "Unknown";
  if (!deathDate) {
    return birth;
  }

  return `${birth} - ${formatDateLabel(deathDate)}`;
}

export function formatPersonName(person: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  maidenName?: string | null;
}) {
  if (person.displayName?.trim()) {
    return person.displayName.trim();
  }

  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
