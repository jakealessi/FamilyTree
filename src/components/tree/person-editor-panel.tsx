"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Camera, Crown, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GENDER_OPTIONS, LIFE_STATUS_OPTIONS } from "@/lib/shared/constants";
import { arrayToLines, formatPersonName, linesToArray } from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

type PersonRecord = TreeBundle["people"][number];

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
  }) => Promise<void>;
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
    generation:
      typeof person?.generation === "number" ? String(person.generation) : "",
    isPrivate: person?.isPrivate ?? true,
  };
}

export function PersonEditorPanel({
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
  const [uploadType, setUploadType] = useState<"PROFILE" | "GALLERY">("PROFILE");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    setForm(formStateFromPerson(person));
  }, [person]);

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
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
      generation: form.generation ? Number(form.generation) : null,
      branchKey: form.branchKey || null,
      isPrivate: form.isPrivate,
    });
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpload({
      file: uploadFile,
      externalUrl: uploadUrl,
      caption: uploadCaption,
      type: uploadType,
    });
    setUploadCaption("");
    setUploadUrl("");
    setUploadFile(null);
  }

  return (
    <Card className="h-full space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--ink-muted)]">
          {person ? "Profile details" : "New profile"}
        </p>
        <h2 className="text-2xl font-semibold text-[var(--ink-strong)]">
          {person ? formatPersonName(person) : "Add a relative"}
        </h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Fill in as much or as little as your family wants now. Every profile can grow over
          time.
        </p>
      </div>

      {claimResult && person ? (
        <div className="rounded-3xl border border-[color:rgba(227,182,97,0.35)] bg-[color:rgba(255,244,223,0.85)] p-4 text-sm text-[var(--ink-strong)]">
          <p className="font-semibold">Personal edit link created for {formatPersonName(person)}.</p>
          <p className="mt-2 text-[var(--ink-soft)]">Recovery code: {claimResult.recoveryCode}</p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={claimResult.personalLink}
              className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-white/85 px-3 py-2 text-xs"
            />
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(claimResult.personalLink)}
            >
              Copy
            </Button>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">First name</label>
            <Input
              required
              value={form.firstName}
              disabled={!canEdit}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Middle name</label>
            <Input
              value={form.middleName}
              disabled={!canEdit}
              onChange={(event) => updateField("middleName", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">Last name</label>
            <Input
              value={form.lastName}
              disabled={!canEdit}
              onChange={(event) => updateField("lastName", event.target.value)}
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
              onChange={(event) => updateField("generation", event.target.value)}
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-strong)]">
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
            <Button type="submit" disabled={isSaving}>
              {person ? "Save profile" : "Create profile"}
            </Button>
          ) : null}
          {canClaim && person ? (
            <Button variant="secondary" onClick={onClaim} className="gap-2">
              <Crown className="size-4" />
              Claim this profile
            </Button>
          ) : null}
          {canDelete && person ? (
            <Button variant="outline" onClick={onDelete} className="gap-2">
              <Trash2 className="size-4" />
              Archive profile
            </Button>
          ) : null}
        </div>
      </form>

      {person ? (
        <div className="space-y-4 rounded-[28px] border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.65)] p-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[var(--ink-strong)]">Photos and media</h3>
            <p className="text-sm text-[var(--ink-soft)]">
              Upload a small local image for the demo app or paste an external image URL.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(person.media.length ? person.media : person.galleryPhotos.map((url, index) => ({
              id: `${person.id}-${index}`,
              url,
              type: "GALLERY",
              caption: null,
              fileName: null,
              mimeType: null,
              sizeBytes: null,
            }))).map((item) => (
              <div key={item.id} className="overflow-hidden rounded-3xl border border-[color:var(--border-soft)] bg-white/80">
                <img src={item.url} alt="" className="h-28 w-full object-cover" />
                <div className="p-3 text-xs text-[var(--ink-muted)]">{item.caption || item.type}</div>
              </div>
            ))}
          </div>

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
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-soft)]">
                <Upload className="size-4" />
                <span>{uploadFile ? uploadFile.name : "Choose a small image file"}</span>
                <input
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
      ) : null}
    </Card>
  );
}
