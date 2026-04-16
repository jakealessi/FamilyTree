"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Camera,
  Crown,
  GraduationCap,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Quote,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { copyTextToClipboard } from "@/lib/client/clipboard";
import { GENDER_OPTIONS, LIFE_STATUS_OPTIONS } from "@/lib/shared/constants";
import {
  arrayToLines,
  formatBranchLabel,
  formatDateRange,
  formatPersonName,
  linesToArray,
} from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

type PersonRecord = TreeBundle["people"][number];
type PanelTab = "overview" | "edit" | "media";

type PersonEditorPanelProps = {
  person: PersonRecord | null;
  canEdit: boolean;
  canDelete: boolean;
  canClaim: boolean;
  isSaving: boolean;
  claimResult: { recoveryCode: string; personalLink: string } | null;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClaim: () => Promise<void>;
  onUpload: (payload: {
    file?: File | null;
    externalUrl?: string;
    caption?: string;
    type: "PROFILE" | "GALLERY";
  }) => Promise<boolean>;
};

function formStateFromPerson(person: PersonRecord | null) {
  return {
    firstName: person?.firstName ?? "",
    middleName: person?.middleName ?? "",
    lastName: person?.lastName ?? "",
    maidenName: person?.maidenName ?? "",
    displayName: person?.displayName ?? "",
    nickname: person?.nickname ?? "",
    gender: person?.gender ?? "UNSPECIFIED",
    lifeStatus: person?.lifeStatus ?? "UNKNOWN",
    birthDate: person?.birthDate?.slice(0, 10) ?? "",
    deathDate: person?.deathDate?.slice(0, 10) ?? "",
    birthplace: person?.birthplace ?? "",
    currentCity: person?.currentCity ?? "",
    bio: person?.bio ?? "",
    occupation: person?.occupation ?? "",
    education: person?.education ?? "",
    hobbies: person?.hobbies ?? "",
    favoriteQuote: person?.favoriteQuote ?? "",
    profilePhotoUrl: person?.profilePhotoUrl ?? "",
    lifeEventsText: arrayToLines(person?.lifeEvents),
    notesText: arrayToLines(person?.notes),
    branchKey: person?.branchKey ?? "",
    generation: typeof person?.generation === "number" ? String(person.generation) : "",
    isPrivate: person?.isPrivate ?? true,
  };
}

function normalizeGenerationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const numericPattern = /^-?\d+$/;
  if (!numericPattern.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function lifeStatusLabel(value: string) {
  return LIFE_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function genderLabel(value: string) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function splitDisplayTags(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-soft)] bg-white p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-base font-semibold text-[var(--ink-strong)]">{title}</h3>
        {description ? <p className="text-sm text-[var(--ink-muted)]">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function OverviewFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-soft)] bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-[var(--ink-muted)]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-strong)]">{value}</p>
    </div>
  );
}

function PersonEditorPanelContent({
  person,
  canEdit,
  canDelete,
  canClaim,
  isSaving,
  claimResult,
  onSave,
  onDelete,
  onClaim,
  onUpload,
}: PersonEditorPanelProps) {
  const [form, setForm] = useState(() => formStateFromPerson(person));
  const [formDirty, setFormDirty] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const personSyncKey = useMemo(
    () => (person ? JSON.stringify(formStateFromPerson(person)) : ""),
    [person],
  );
  const [lastServerSyncKey, setLastServerSyncKey] = useState(personSyncKey);
  if (personSyncKey !== lastServerSyncKey && !formDirty) {
    setLastServerSyncKey(personSyncKey);
    setForm(formStateFromPerson(person));
    setGenerationError(false);
  }
  const [activeTab, setActiveTab] = useState<PanelTab>(person ? "overview" : "edit");
  const [uploadType, setUploadType] = useState<"PROFILE" | "GALLERY">("PROFILE");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [copiedClaimLink, setCopiedClaimLink] = useState<string | null>(null);
  const [failedClaimLink, setFailedClaimLink] = useState<string | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  const mediaItems = useMemo(() => {
    if (!person) {
      return [];
    }

    return person.media.length
      ? person.media
      : person.galleryPhotos.map((url, index) => ({
          id: `${person.id}-${index}`,
          url,
          type: "GALLERY",
          caption: null,
          fileName: null,
          mimeType: null,
          sizeBytes: null,
        }));
  }, [person]);

  const lifeEvents = person?.lifeEvents ?? [];
  const notes = person?.notes ?? [];
  const hobbyTags = splitDisplayTags(person?.hobbies);
  const claimCopyState =
    claimResult && copiedClaimLink === claimResult.personalLink
      ? "copied"
      : claimResult && failedClaimLink === claimResult.personalLink
        ? "failed"
        : "idle";

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setFormDirty(true);
    if (key === "generation") {
      setGenerationError(false);
    }
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedGeneration = normalizeGenerationInput(form.generation);
    if (normalizedGeneration === null) {
      setGenerationError(true);
      return;
    }
    setGenerationError(false);

    await onSave({
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      maidenName: form.maidenName,
      displayName: form.displayName,
      nickname: form.nickname,
      gender: form.gender,
      lifeStatus: form.lifeStatus,
      birthDate: form.birthDate || null,
      deathDate: form.deathDate || null,
      birthplace: form.birthplace,
      currentCity: form.currentCity,
      bio: form.bio,
      occupation: form.occupation,
      education: form.education,
      hobbies: form.hobbies,
      favoriteQuote: form.favoriteQuote,
      profilePhotoUrl: form.profilePhotoUrl,
      lifeEvents: linesToArray(form.lifeEventsText),
      notes: linesToArray(form.notesText),
      galleryPhotos: person?.galleryPhotos ?? [],
      generation: normalizedGeneration ? Number(normalizedGeneration) : null,
      branchKey: form.branchKey.trim() || null,
      isPrivate: form.isPrivate,
    });
    setFormDirty(false);
    if (person) {
      setActiveTab("overview");
    }
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const didUpload = await onUpload({
      file: uploadFile,
      externalUrl: uploadUrl,
      caption: uploadCaption,
      type: uploadType,
    });

    if (didUpload) {
      setUploadCaption("");
      setUploadUrl("");
      setUploadFile(null);
      if (uploadFileInputRef.current) {
        uploadFileInputRef.current.value = "";
      }
    }
  }

  async function handleCopyClaimLink() {
    if (!claimResult) {
      return;
    }

    const didCopy = await copyTextToClipboard(claimResult.personalLink);
    if (didCopy) {
      setCopiedClaimLink(claimResult.personalLink);
      setFailedClaimLink(null);
      return;
    }

    setCopiedClaimLink(null);
    setFailedClaimLink(claimResult.personalLink);
  }

  function renderClaimResult() {
    if (!claimResult || !person) {
      return null;
    }

    return (
      <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.03)] p-4 text-sm text-[var(--ink-strong)]">
        <p className="font-semibold">Personal edit link created for {formatPersonName(person)}.</p>
        <p className="mt-2 text-[var(--ink-soft)]">Recovery code: {claimResult.recoveryCode}</p>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={claimResult.personalLink}
            className="w-full rounded-lg border border-[color:var(--border-soft)] bg-white/85 px-3 py-2 text-xs"
          />
          <Button variant="outline" onClick={handleCopyClaimLink}>
            {claimCopyState === "copied"
              ? "Copied"
              : claimCopyState === "failed"
                ? "Copy manually"
                : "Copy"}
          </Button>
        </div>
        {claimCopyState === "failed" ? (
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            Copying was blocked on this device, so you can select the link above and copy it manually.
          </p>
        ) : null}
      </div>
    );
  }

  function renderOverview() {
    if (!person) {
      return (
        <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.02)] p-6 text-sm text-[var(--ink-soft)]">
          Select someone from the tree, or start a new profile to begin building this branch.
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-[color:var(--border-soft)] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                {person.profilePhotoUrl ? (
                  <img
                    src={person.profilePhotoUrl}
                    alt={formatPersonName(person)}
                    className="size-20 object-cover"
                  />
                ) : (
                  <Sparkles className="size-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                    {lifeStatusLabel(person.lifeStatus)}
                  </Badge>
                  {person.claimedBy ? <Badge>Claimed</Badge> : null}
                  <Badge className="bg-[color:rgba(255,255,255,0.72)] text-[var(--ink-soft)]">
                    {person.isPrivate ? "Private profile" : "Shared profile"}
                  </Badge>
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
                  {formatPersonName(person)}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  {person.bio ||
                    "This profile is ready for family memories, milestones, and the details that make the person feel real."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <OverviewFact
                icon={<CalendarDays className="size-4 text-[var(--ink-muted)]" />}
                label="Dates"
                value={formatDateRange(person.birthDate, person.deathDate)}
              />
              <OverviewFact
                icon={<MapPin className="size-4 text-[var(--ink-muted)]" />}
                label="Location"
                value={person.currentCity || person.birthplace || "No location added yet"}
              />
              <OverviewFact
                icon={<Briefcase className="size-4 text-[var(--ink-muted)]" />}
                label="Occupation"
                value={person.occupation || "Not added yet"}
              />
              <OverviewFact
                icon={<GraduationCap className="size-4 text-[var(--ink-muted)]" />}
                label="Education"
                value={person.education || "Not added yet"}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <ProfileSection title="Profile snapshot" description="Quick details at a glance.">
            <div className="grid gap-3 sm:grid-cols-2">
              <OverviewFact
                icon={<Sparkles className="size-4 text-[var(--ink-muted)]" />}
                label="Gender"
                value={genderLabel(person.gender)}
              />
              <OverviewFact
                icon={<Heart className="size-4 text-[var(--ink-muted)]" />}
                label="Nickname"
                value={person.nickname || "No nickname added"}
              />
              <OverviewFact
                icon={<MapPin className="size-4 text-[var(--ink-muted)]" />}
                label="Birthplace"
                value={person.birthplace || "No birthplace added"}
              />
              <OverviewFact
                icon={<Lock className="size-4 text-[var(--ink-muted)]" />}
                label="Branch"
                value={formatBranchLabel(person.branchKey)}
              />
            </div>
          </ProfileSection>

          {person.favoriteQuote ? (
            <ProfileSection title="Favorite quote" description="A personal line worth keeping.">
              <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/72 px-5 py-4">
                <p className="flex items-start gap-3 text-sm leading-7 text-[var(--ink-strong)]">
                  <Quote className="mt-1 size-4 shrink-0 text-[var(--ink-muted)]" />
                  <span>{person.favoriteQuote}</span>
                </p>
              </div>
            </ProfileSection>
          ) : null}

          {person.occupation || person.education || hobbyTags.length > 0 ? (
            <ProfileSection
              title="Work, learning, and interests"
              description="The details that make the profile feel lived in."
            >
              <div className="space-y-4">
                {person.occupation ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      Occupation
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-strong)]">
                      {person.occupation}
                    </p>
                  </div>
                ) : null}
                {person.education ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      Education
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-strong)]">
                      {person.education}
                    </p>
                  </div>
                ) : null}
                {hobbyTags.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      Hobbies
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hobbyTags.map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </ProfileSection>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <ProfileSection
              title="Life events"
              description="Milestones, moments, and family memories."
            >
              {lifeEvents.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">
                  No life events have been added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {lifeEvents.map((event) => (
                    <div
                      key={event}
                      className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 px-4 py-3 text-sm text-[var(--ink-strong)]"
                    >
                      {event}
                    </div>
                  ))}
                </div>
              )}
            </ProfileSection>

            <ProfileSection
              title="Notes and context"
              description="Private or family-shared notes connected to the profile."
            >
              {notes.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">No notes have been added yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note}
                      className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 px-4 py-3 text-sm leading-7 text-[var(--ink-strong)]"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </ProfileSection>
          </div>

          <ProfileSection
            title="Media"
            description="Photos and keepsakes already attached to this profile."
          >
            {mediaItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-white/60 p-4 text-sm text-[var(--ink-soft)]">
                No media has been added yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mediaItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-lg border border-[color:var(--border-soft)] bg-white/80"
                  >
                    <img src={item.url} alt="" className="h-28 w-full object-cover" />
                    <div className="p-3 text-xs text-[var(--ink-muted)]">
                      {item.caption || item.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>
        </div>
      </div>
    );
  }

  function renderEditForm() {
    return (
      <form className="space-y-5" onSubmit={handleSubmit}>
        {person && !canEdit ? (
          <p
            className="border-l-2 border-[var(--border-soft)] pl-3 text-sm text-[var(--ink-muted)]"
            role="status"
          >
            View only — this link cannot edit profiles.
          </p>
        ) : null}
        {canEdit && formDirty ? (
          <p className="text-xs font-medium text-[#8D642A]" role="status">
            Unsaved changes — save below.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">First name</label>
            <Input
              required
              value={form.firstName}
              disabled={!canEdit}
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder="e.g. Maya"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Middle name</label>
            <Input
              value={form.middleName}
              disabled={!canEdit}
              onChange={(event) => updateField("middleName", event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Last name</label>
            <Input
              value={form.lastName}
              disabled={!canEdit}
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder="e.g. Rivera"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Display name</label>
            <Input
              value={form.displayName}
              disabled={!canEdit}
              onChange={(event) => updateField("displayName", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Nickname</label>
            <Input
              value={form.nickname}
              disabled={!canEdit}
              onChange={(event) => updateField("nickname", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Maiden name</label>
            <Input
              value={form.maidenName}
              disabled={!canEdit}
              onChange={(event) => updateField("maidenName", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Gender</label>
            <select
              value={form.gender}
              disabled={!canEdit}
              onChange={(event) => updateField("gender", event.target.value)}
              className={fieldClassName}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Life status</label>
            <select
              value={form.lifeStatus}
              disabled={!canEdit}
              onChange={(event) => updateField("lifeStatus", event.target.value)}
              className={fieldClassName}
            >
              {LIFE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Birth date</label>
            <Input
              type="date"
              value={form.birthDate}
              disabled={!canEdit}
              onChange={(event) => updateField("birthDate", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Death date</label>
            <Input
              type="date"
              value={form.deathDate}
              disabled={!canEdit}
              onChange={(event) => updateField("deathDate", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Birthplace</label>
            <Input
              value={form.birthplace}
              disabled={!canEdit}
              onChange={(event) => updateField("birthplace", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Current city</label>
            <Input
              value={form.currentCity}
              disabled={!canEdit}
              onChange={(event) => updateField("currentCity", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Occupation</label>
            <Input
              value={form.occupation}
              disabled={!canEdit}
              onChange={(event) => updateField("occupation", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Education</label>
            <Input
              value={form.education}
              disabled={!canEdit}
              onChange={(event) => updateField("education", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Hobbies</label>
            <Input
              value={form.hobbies}
              disabled={!canEdit}
              onChange={(event) => updateField("hobbies", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Branch key</label>
            <Input
              value={form.branchKey}
              disabled={!canEdit}
              onChange={(event) => updateField("branchKey", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Generation</label>
            <Input
              inputMode="numeric"
              value={form.generation}
              disabled={!canEdit}
              onChange={(event) => {
                const normalized = normalizeGenerationInput(event.target.value);
                if (normalized !== null) {
                  updateField("generation", normalized);
                }
              }}
            />
            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              Use whole numbers only, like 0, 1, or 2.
            </p>
            {generationError ? (
              <p className="mt-2 text-xs font-medium text-[#9A4136]">
                Fix the generation field (whole numbers only), then save again.
              </p>
            ) : null}
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-[color:var(--border-soft)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-strong)]">
            <input
              type="checkbox"
              checked={form.isPrivate}
              disabled={!canEdit}
              onChange={(event) => updateField("isPrivate", event.target.checked)}
              className="size-4 rounded"
            />
            Private by default
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Bio</label>
          <Textarea
            value={form.bio}
            disabled={!canEdit}
            onChange={(event) => updateField("bio", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Favorite quote</label>
          <Textarea
            value={form.favoriteQuote}
            disabled={!canEdit}
            onChange={(event) => updateField("favoriteQuote", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Life events, one per line</label>
          <Textarea
            value={form.lifeEventsText}
            disabled={!canEdit}
            onChange={(event) => updateField("lifeEventsText", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Notes, one per line</label>
          <Textarea
            value={form.notesText}
            disabled={!canEdit}
            onChange={(event) => updateField("notesText", event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="ui-spinner size-4" aria-hidden /> : null}
              {isSaving
                ? "Saving…"
                : person
                  ? "Save profile"
                  : "Create profile"}
            </Button>
          ) : null}
          {person && canEdit ? (
            <Button type="button" variant="outline" onClick={() => setActiveTab("overview")}>
              Back to overview
            </Button>
          ) : null}
        </div>
      </form>
    );
  }

  function renderMediaPanel() {
    if (!person) {
      return null;
    }

    return (
      <div className="space-y-4 rounded-lg border border-[color:var(--border-soft)] bg-white p-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[var(--ink-strong)]">Photos and media</h3>
          <p className="text-sm text-[var(--ink-soft)]">
            Add profile and gallery photos so the tree feels more personal for everyone.
          </p>
        </div>

        {mediaItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-white/60 p-4 text-sm text-[var(--ink-soft)]">
            No media has been uploaded yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-[color:var(--border-soft)] bg-white/80"
              >
                <img src={item.url} alt="" className="h-28 w-full object-cover" />
                <div className="p-3 text-xs text-[var(--ink-muted)]">{item.caption || item.type}</div>
              </div>
            ))}
          </div>
        )}

        {canEdit ? (
          <form onSubmit={handleUploadSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={uploadType}
                onChange={(event) => setUploadType(event.target.value as "PROFILE" | "GALLERY")}
                className={fieldClassName}
              >
                <option value="PROFILE">Profile photo</option>
                <option value="GALLERY">Gallery photo</option>
              </select>
              <Input
                value={uploadCaption}
                onChange={(event) => setUploadCaption(event.target.value)}
                placeholder="Caption"
              />
            </div>
            <Input
              value={uploadUrl}
              onChange={(event) => setUploadUrl(event.target.value)}
              placeholder="Paste an external image URL, or choose a file below"
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[color:var(--border-soft)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-soft)]">
              <Upload className="size-4" />
              <span>{uploadFile ? uploadFile.name : "Choose a small image file"}</span>
              <input
                ref={uploadFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex gap-3">
              <Button variant="outline" type="submit" className="gap-2">
                <Camera className="size-4" />
                Upload media
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="h-full space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)] md:text-2xl">
            {person ? formatPersonName(person) : "New person"}
          </h2>
          {!person ? (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Name and details — save when ready.</p>
          ) : null}
        </div>

        {person ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
              {lifeStatusLabel(person.lifeStatus)}
            </Badge>
            <Badge className="bg-[color:rgba(255,255,255,0.72)] text-[var(--ink-soft)]">
              {formatBranchLabel(person.branchKey)}
            </Badge>
            {typeof person.generation === "number" ? <Badge>Generation {person.generation}</Badge> : null}
            {person.claimedBy ? <Badge>Claimed</Badge> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {person ? (
            <Button
              type="button"
              variant={activeTab === "overview" ? "secondary" : "outline"}
              className="min-h-9 px-3 py-1.5 text-xs"
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </Button>
          ) : null}

          {person && canEdit ? (
            <Button
              type="button"
              variant={activeTab === "edit" ? "secondary" : "outline"}
              className="relative min-h-9 px-3 py-1.5 text-xs"
              onClick={() => setActiveTab("edit")}
            >
              Edit
              {formDirty && activeTab !== "edit" ? (
                <span
                  className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full border border-white bg-[var(--brand-amber)]"
                  title="Unsaved edits"
                  aria-hidden
                />
              ) : null}
            </Button>
          ) : null}

          {person ? (
            <Button
              type="button"
              variant={activeTab === "media" ? "secondary" : "outline"}
              className="min-h-9 px-3 py-1.5 text-xs"
              onClick={() => setActiveTab("media")}
            >
              Media
            </Button>
          ) : null}

          {canClaim && person ? (
            <Button type="button" variant="secondary" onClick={onClaim} className="gap-2">
              <Crown className="size-4" />
              Claim this profile
            </Button>
          ) : null}
          {canDelete && person ? (
            <Button type="button" variant="outline" onClick={onDelete} className="gap-2">
              <Trash2 className="size-4" />
              Archive profile
            </Button>
          ) : null}
        </div>
      </div>

      {renderClaimResult()}

      {!person || activeTab === "edit" ? renderEditForm() : null}
      {person && activeTab === "overview" ? renderOverview() : null}
      {person && activeTab === "media" ? renderMediaPanel() : null}
    </Card>
  );
}

export function PersonEditorPanel(props: PersonEditorPanelProps) {
  const panelKey = props.person?.id ?? "new-profile";

  return <PersonEditorPanelContent key={panelKey} {...props} />;
}
