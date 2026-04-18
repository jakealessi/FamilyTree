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
    isPrivate: person?.isPrivate ?? true,
  };
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
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave({
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      maidenName: form.maidenName,
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
      <div className="rounded-lg border border-[color:rgba(42,74,47,0.18)] bg-[color:rgba(42,74,47,0.05)] p-4 text-sm text-[var(--ink-strong)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
            <Crown className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">This profile is now linked to you.</p>
            <p className="mt-1 leading-6 text-[var(--ink-soft)]">
              Keep these details somewhere safe. The personal edit link lets only you open this
              profile for editing, and the recovery code helps if you switch devices later.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[color:var(--border-soft)] bg-white/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Recovery code
          </p>
          <p className="mt-2 font-mono text-sm text-[var(--ink-strong)]">
            {claimResult.recoveryCode}
          </p>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Personal edit link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={claimResult.personalLink}
              aria-label={`Personal edit link for ${formatPersonName(person)}`}
              className="w-full rounded-lg border border-[color:var(--border-soft)] bg-white/85 px-3 py-2 text-xs"
            />
            <Button variant="outline" onClick={handleCopyClaimLink} className="sm:min-w-28">
              {claimCopyState === "copied"
                ? "Copied"
                : claimCopyState === "failed"
                  ? "Copy manually"
                  : "Copy link"}
            </Button>
          </div>
        </div>
        {claimCopyState === "failed" ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Your browser did not copy it automatically, so you can copy it manually from the box.
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
          Share the family edit link with relatives. Keep this personal link just for yourself.
        </p>
      </div>
    );
  }

  function renderOverview() {
    if (!person) {
      return (
        <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.02)] p-6 text-sm text-[var(--ink-muted)]">
          <p className="font-semibold text-[var(--ink-strong)]">Choose a person to see details</p>
          <p className="mt-2 leading-6">
            Tap a person in the tree or the people list. If you want to add someone new, use
            the add button first.
          </p>
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
                {person.bio ? (
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{person.bio}</p>
                ) : null}
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
                value={person.currentCity || person.birthplace || "—"}
              />
              <OverviewFact
                icon={<Briefcase className="size-4 text-[var(--ink-muted)]" />}
                label="Occupation"
                value={person.occupation || "—"}
              />
              <OverviewFact
                icon={<GraduationCap className="size-4 text-[var(--ink-muted)]" />}
                label="Education"
                value={person.education || "—"}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <ProfileSection title="Snapshot">
            <div className="grid gap-3 sm:grid-cols-2">
              <OverviewFact
                icon={<Sparkles className="size-4 text-[var(--ink-muted)]" />}
                label="Gender"
                value={genderLabel(person.gender)}
              />
              <OverviewFact
                icon={<Heart className="size-4 text-[var(--ink-muted)]" />}
                label="Nickname"
                value={person.nickname || "—"}
              />
              <OverviewFact
                icon={<MapPin className="size-4 text-[var(--ink-muted)]" />}
                label="Birthplace"
                value={person.birthplace || "—"}
              />
            </div>
          </ProfileSection>

          {person.favoriteQuote ? (
            <ProfileSection title="Quote">
              <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/72 px-5 py-4">
                <p className="flex items-start gap-3 text-sm leading-7 text-[var(--ink-strong)]">
                  <Quote className="mt-1 size-4 shrink-0 text-[var(--ink-muted)]" />
                  <span>{person.favoriteQuote}</span>
                </p>
              </div>
            </ProfileSection>
          ) : null}

          {person.occupation || person.education || hobbyTags.length > 0 ? (
            <ProfileSection title="Work & interests">
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
            <ProfileSection title="Life events">
              {lifeEvents.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">—</p>
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

            <ProfileSection title="Notes">
              {notes.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">—</p>
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

          <ProfileSection title="Media">
            {mediaItems.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">—</p>
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
    const detailsFilled = Boolean(
      form.middleName ||
        form.maidenName ||
        form.gender !== "UNSPECIFIED" ||
        form.birthDate ||
        form.deathDate ||
        form.birthplace ||
        form.occupation ||
        form.education ||
        form.hobbies,
    );
    const storyFilled = Boolean(
      form.bio || form.favoriteQuote || form.lifeEventsText || form.notesText,
    );

    return (
      <form className="space-y-5" onSubmit={handleSubmit}>
        {person && !canEdit ? (
          <p
            className="border-l-2 border-[var(--border-soft)] pl-3 text-sm text-[var(--ink-muted)]"
            role="status"
          >
            View only
          </p>
        ) : null}
        {canEdit && formDirty ? (
          <p className="text-xs font-medium text-[#8D642A]" role="status">
            You have unsaved changes
          </p>
        ) : null}
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:rgba(255,248,234,0.72)] p-4">
          <p className="font-semibold text-[var(--ink-strong)]">
            {person ? "Edit this profile one step at a time." : "Start with the basics."}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
            Only the first name is required. Everything else is optional and can be added later.
          </p>
          <div className="mt-3 grid gap-2 text-xs text-[var(--ink-soft)] sm:grid-cols-3">
            <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 px-3 py-2">
              1. Add the name you know
            </div>
            <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 px-3 py-2">
              2. Save whenever you are ready
            </div>
            <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 px-3 py-2">
              3. Come back later for more detail
            </div>
          </div>
        </div>

        <ProfileSection
          title="Basic details"
          description="Add only what you know right now. The rest can wait."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                First name
              </label>
              <Input
                required
                value={form.firstName}
                disabled={!canEdit}
                placeholder="e.g. Maria"
                onChange={(event) => updateField("firstName", event.target.value)}
              />
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                This is the only field required to save the profile.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Last name
              </label>
              <Input
                value={form.lastName}
                disabled={!canEdit}
                placeholder="e.g. Alvarez"
                onChange={(event) => updateField("lastName", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Nickname
              </label>
              <Input
                value={form.nickname}
                disabled={!canEdit}
                placeholder="e.g. Aunt May"
                onChange={(event) => updateField("nickname", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Life status
              </label>
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
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Current city
              </label>
              <Input
                value={form.currentCity}
                disabled={!canEdit}
                placeholder="e.g. Denver"
                onChange={(event) => updateField("currentCity", event.target.value)}
              />
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-[color:var(--border-soft)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-strong)]">
              <input
                type="checkbox"
                checked={form.isPrivate}
                disabled={!canEdit}
                onChange={(event) => updateField("isPrivate", event.target.checked)}
                className="size-4 rounded"
              />
              Keep this profile private by default
            </label>
          </div>
        </ProfileSection>

        <details className="rounded-lg border border-[color:var(--border-soft)] bg-white">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--ink-strong)]">
                  Optional details
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  Dates, places, work, school, and identity details.
                </p>
              </div>
              <Badge>{detailsFilled ? "Has details" : "Optional"}</Badge>
            </div>
          </summary>
          <div className="border-t border-[color:var(--border-soft)] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Middle name
                </label>
                <Input
                  value={form.middleName}
                  disabled={!canEdit}
                  placeholder="e.g. Grace"
                  onChange={(event) => updateField("middleName", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Maiden name
                </label>
                <Input
                  value={form.maidenName}
                  disabled={!canEdit}
                  placeholder="e.g. Carter"
                  onChange={(event) => updateField("maidenName", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Gender
                </label>
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
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Birth date
                </label>
                <Input
                  type="date"
                  value={form.birthDate}
                  disabled={!canEdit}
                  placeholder="Birth date"
                  onChange={(event) => updateField("birthDate", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Death date
                </label>
                <Input
                  type="date"
                  value={form.deathDate}
                  disabled={!canEdit}
                  placeholder="Death date"
                  onChange={(event) => updateField("deathDate", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Birthplace
                </label>
                <Input
                  value={form.birthplace}
                  disabled={!canEdit}
                  placeholder="e.g. Savannah, Georgia"
                  onChange={(event) => updateField("birthplace", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Occupation
                </label>
                <Input
                  value={form.occupation}
                  disabled={!canEdit}
                  placeholder="e.g. Teacher"
                  onChange={(event) => updateField("occupation", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Education
                </label>
                <Input
                  value={form.education}
                  disabled={!canEdit}
                  placeholder="e.g. Howard University"
                  onChange={(event) => updateField("education", event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Hobbies
                </label>
                <Input
                  value={form.hobbies}
                  disabled={!canEdit}
                  placeholder="Gardening, baking, fishing"
                  onChange={(event) => updateField("hobbies", event.target.value)}
                />
              </div>
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-[color:var(--border-soft)] bg-white">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--ink-strong)]">
                  Stories and notes
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  Add a short bio, favorite quote, life events, or family notes.
                </p>
              </div>
              <Badge>{storyFilled ? "Has notes" : "Optional"}</Badge>
            </div>
          </summary>
          <div className="space-y-4 border-t border-[color:var(--border-soft)] px-5 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Bio
              </label>
              <Textarea
                value={form.bio}
                disabled={!canEdit}
                placeholder="A few sentences relatives would recognize right away"
                onChange={(event) => updateField("bio", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Favorite quote
              </label>
              <Textarea
                value={form.favoriteQuote}
                disabled={!canEdit}
                placeholder="A saying they were known for"
                onChange={(event) => updateField("favoriteQuote", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Life events, one per line
              </label>
              <Textarea
                value={form.lifeEventsText}
                disabled={!canEdit}
                placeholder={"Graduated from college\nMoved to Chicago"}
                onChange={(event) => updateField("lifeEventsText", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Notes, one per line
              </label>
              <Textarea
                value={form.notesText}
                disabled={!canEdit}
                placeholder={"Loves gardening\nKeeps the family recipes"}
                onChange={(event) => updateField("notesText", event.target.value)}
              />
            </div>
          </div>
        </details>

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
        {canEdit ? (
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            You can save now with only a first name and come back later for the rest.
          </p>
        ) : null}
      </form>
    );
  }

  function renderMediaPanel() {
    if (!person) {
      return null;
    }

    return (
      <div className="space-y-4 rounded-lg border border-[color:var(--border-soft)] bg-white p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[var(--ink-strong)]">Photos</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Add a profile photo or a few gallery images for this person.
          </p>
        </div>

        {mediaItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.02)] p-4 text-sm text-[var(--ink-muted)]">
            {canEdit
              ? "No photos yet. Paste an image link or choose a file below."
              : "No photos have been added for this person yet."}
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
                placeholder="Short caption (optional)"
              />
            </div>
            <Input
              value={uploadUrl}
              onChange={(event) => setUploadUrl(event.target.value)}
              placeholder="Paste an image URL, or choose a file below"
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[color:var(--border-soft)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-soft)]">
              <Upload className="size-4" />
              <span>{uploadFile ? uploadFile.name : "Choose an image file"}</span>
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
                Add photo
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="h-full space-y-6 bg-[color:rgba(255,255,255,0.84)]">
      <div className="space-y-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.62)] p-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--ink-strong)] md:text-2xl">
            {person ? formatPersonName(person) : "New family member"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
            {person
              ? "Choose a section below to read the profile, change details, or add photos."
              : "Start with the first name, save, and come back later for the rest if you want."}
          </p>
        </div>

        {person ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
              {lifeStatusLabel(person.lifeStatus)}
            </Badge>
            {person.claimedBy ? <Badge>Claimed</Badge> : null}
          </div>
        ) : null}

        {person ? (
          <div className="flex flex-wrap gap-2 rounded-2xl bg-[color:rgba(42,74,47,0.05)] p-1">
            <Button
              type="button"
              variant={activeTab === "overview" ? "secondary" : "ghost"}
              className="min-h-10 flex-1 px-3 py-1.5 text-xs sm:flex-none"
              onClick={() => setActiveTab("overview")}
            >
              View profile
            </Button>

            {person && canEdit ? (
              <Button
                type="button"
                variant={activeTab === "edit" ? "secondary" : "ghost"}
                className="relative min-h-10 flex-1 px-3 py-1.5 text-xs sm:flex-none"
                onClick={() => setActiveTab("edit")}
              >
                Edit details
                {formDirty && activeTab !== "edit" ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full border border-white bg-[var(--brand-amber)]"
                    title="Unsaved edits"
                    aria-hidden
                  />
                ) : null}
              </Button>
            ) : null}

            <Button
              type="button"
              variant={activeTab === "media" ? "secondary" : "ghost"}
              className="min-h-10 flex-1 px-3 py-1.5 text-xs sm:flex-none"
              onClick={() => setActiveTab("media")}
            >
              Photos
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
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

        {person ? (
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            {activeTab === "overview"
              ? "Overview shows the main facts and memories for this person."
              : activeTab === "edit"
                ? "Edit details here. You only need the basics to save."
                : "Photos can be added from a file or by pasting an image link."}
          </p>
        ) : null}

        {canClaim && person ? (
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            Use “Claim this profile” only if this person is you. It creates a personal link that
            edits only your own profile.
          </p>
        ) : null}
      </div>

      {renderClaimResult()}

      {!person || activeTab === "edit" ? renderEditForm() : null}
      {person && activeTab === "overview" ? renderOverview() : null}
      {person && activeTab === "media" ? renderMediaPanel() : null}
    </Card>
  );
}

export function PersonEditorPanel(props: PersonEditorPanelProps) {
  const panelKey = props.person
    ? `${props.person.id}:${JSON.stringify(formStateFromPerson(props.person))}`
    : "new-profile";

  return <PersonEditorPanelContent key={panelKey} {...props} />;
}
