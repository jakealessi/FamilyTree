"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  Compass,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { PersonEditorPanel } from "@/components/tree/person-editor-panel";
import { ShareLinksCard } from "@/components/tree/share-links-card";
import {
  clearStoredSession,
  getOrCreateEditorToken,
  getStoredEditorName,
  getStoredSession,
  storeEditorName,
  storeSession,
} from "@/lib/client/local-identity";
import { ROLE_LABELS, RELATIONSHIP_OPTIONS, VIEW_MODE_OPTIONS } from "@/lib/shared/constants";
import type { StarterSpacePreset } from "@/lib/shared/starter-spaces";
import { formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle, WorkspaceViewMode } from "@/types/family-tree";

import { FamilyFlow } from "./family-flow";

type TreeWorkspaceProps = {
  slug: string;
  initialToken?: string | null;
  initialPersonalToken?: string | null;
};

type SessionState = {
  token: string | null;
  personalToken: string | null;
  editorToken: string | null;
};

type ClaimResult = {
  personId: string;
  recoveryCode: string;
  personalLink: string;
};

const NEW_PERSON_ID = "__new_person__";

function personalTokenFromLink(url: string) {
  return new URL(url).searchParams.get("personal");
}

function parseAccessInput(value: string) {
  const trimmed = value.trim();
  const isRawPersonalToken =
    trimmed.startsWith("personal_") || trimmed.startsWith("claim_");

  if (!trimmed) {
    return {
      token: null,
      personalToken: null,
    };
  }

  try {
    const parsed = new URL(trimmed);
    return {
      token: parsed.searchParams.get("token"),
      personalToken: parsed.searchParams.get("personal"),
    };
  } catch {
    return {
      token: isRawPersonalToken ? null : trimmed,
      personalToken: isRawPersonalToken ? trimmed : null,
    };
  }
}

function isRollbackSupported(entry: TreeBundle["history"][number]) {
  if (entry.entityType === "PERSON") {
    return (
      entry.action === "CREATE" ||
      entry.action === "UPDATE" ||
      entry.action === "SOFT_DELETE"
    );
  }

  if (entry.entityType === "RELATIONSHIP") {
    return (
      entry.action === "CREATE" ||
      entry.action === "UPDATE" ||
      entry.action === "SOFT_DELETE" ||
      entry.action === "APPROVE" ||
      entry.action === "REJECT"
    );
  }

  if (entry.entityType === "CLAIM") {
    return entry.action === "CLAIM";
  }

  return false;
}

export function TreeWorkspace({
  slug,
  initialToken = null,
  initialPersonalToken = null,
}: TreeWorkspaceProps) {
  const [session, setSession] = useState<SessionState>({
    token: null,
    personalToken: null,
    editorToken: null,
  });
  const [bundle, setBundle] = useState<TreeBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [starterPreset, setStarterPreset] = useState<StarterSpacePreset | null>(null);
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>("artistic");
  const [search, setSearch] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [editorName, setEditorName] = useState("");
  const [relationshipDraft, setRelationshipDraft] = useState({
    fromPersonId: "",
    toPersonId: "",
    type: "PARENT",
    note: "",
  });
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const stored = getStoredSession(slug);
    const nextStoredSession = initialPersonalToken
      ? {
          token: null,
          personalToken: initialPersonalToken,
        }
      : initialToken
        ? {
            token: initialToken,
            personalToken: null,
          }
        : {
            token: stored.token,
            personalToken: stored.personalToken,
          };
    const merged = storeSession(slug, {
      token: nextStoredSession.token,
      personalToken: nextStoredSession.personalToken,
    });
    const editorToken = getOrCreateEditorToken(slug);
    const storedName = getStoredEditorName(slug);

    setSession({
      token: merged.token,
      personalToken: merged.personalToken,
      editorToken,
    });
    setEditorName(storedName);
  }, [initialPersonalToken, initialToken, slug]);

  useEffect(() => {
    if (!session.token && !session.personalToken && !session.editorToken) {
      return;
    }

    void refreshTree({
      token: session.token,
      personalToken: session.personalToken,
      editorToken: session.editorToken,
    });
    // `refreshTree` intentionally reads the latest editor name and session state.
    // Re-running on its identity would create a fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.personalToken, session.token, session.editorToken]);

  const filteredPeople = !bundle
    ? []
    : (() => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
          return bundle.people;
        }

        return bundle.people.filter((person) =>
          [formatPersonName(person), person.currentCity, person.occupation]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        );
      })();

  useEffect(() => {
    if (!bundle) {
      return;
    }

    if (selectedPersonId === NEW_PERSON_ID) {
      return;
    }

    const personIds = new Set(bundle.people.map((person) => person.id));
    if (selectedPersonId && personIds.has(selectedPersonId)) {
      return;
    }

    const fallbackSelection =
      (bundle.access.claimedPersonId && personIds.has(bundle.access.claimedPersonId)
        ? bundle.access.claimedPersonId
        : null) ??
      bundle.people[0]?.id ??
      null;

    setSelectedPersonId(fallbackSelection);
  }, [bundle, selectedPersonId]);

  useEffect(() => {
    if (!claimResult) {
      return;
    }

    if (selectedPersonId !== claimResult.personId) {
      setClaimResult(null);
    }
  }, [claimResult, selectedPersonId]);

  const selectedPerson =
    selectedPersonId === NEW_PERSON_ID
      ? null
      : bundle?.people.find((person) => person.id === selectedPersonId) ?? null;
  const canCreatePeople =
    bundle?.access.role === "OWNER" || bundle?.access.role === "CONTRIBUTOR";
  const canModerate = bundle?.access.role === "OWNER";
  const canEditSelected =
    bundle?.access.role === "OWNER" ||
    bundle?.access.role === "CONTRIBUTOR" ||
    (bundle?.access.role === "PERSONAL" &&
      selectedPerson?.id === bundle.access.claimedPersonId);
  const canDeleteSelected =
    Boolean(selectedPerson) &&
    (bundle?.access.role === "OWNER" || bundle?.access.role === "CONTRIBUTOR");
  const canClaimSelected =
    Boolean(selectedPerson) &&
    !selectedPerson?.claimedBy &&
    (bundle?.access.role === "OWNER" || bundle?.access.role === "CONTRIBUTOR");

  async function refreshTree(nextSession: SessionState) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trees/${slug}`, {
        headers: {
          ...(nextSession.token ? { "x-tree-token": nextSession.token } : {}),
          ...(nextSession.personalToken
            ? { "x-personal-token": nextSession.personalToken }
            : {}),
          ...(nextSession.editorToken
            ? { "x-editor-token": nextSession.editorToken }
            : {}),
        },
      });

      const json = (await response.json()) as TreeBundle & { error?: string };

      if (!response.ok) {
        setBundle(null);
        setError(json.error ?? "This tree could not be opened.");
        return;
      }

      setBundle(json);

      if (
        nextSession.editorToken &&
        (json.access.role === "OWNER" ||
          json.access.role === "CONTRIBUTOR" ||
          json.access.role === "PERSONAL")
      ) {
        await fetch(`/api/trees/${slug}/identity`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(nextSession.token ? { "x-tree-token": nextSession.token } : {}),
            ...(nextSession.personalToken
              ? { "x-personal-token": nextSession.personalToken }
              : {}),
          },
          body: JSON.stringify({
            browserToken: nextSession.editorToken,
            displayName: editorName || null,
          }),
        });
      }
    } catch {
      setError("The tree could not be loaded. Check the server and database connection.");
    } finally {
      setLoading(false);
    }
  }

  function requestHeaders() {
    return {
      ...(session.token ? { "x-tree-token": session.token } : {}),
      ...(session.personalToken ? { "x-personal-token": session.personalToken } : {}),
      ...(session.editorToken ? { "x-editor-token": session.editorToken } : {}),
    };
  }

  async function runAction(
    label: string,
    action: () => Promise<Response>,
    onSuccess?: (payload: unknown) => void,
  ) {
    setBusyMessage(label);
    setClaimResult(null);

    try {
      const response = await action();
      const json = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(json.error ?? `Could not ${label.toLowerCase()}.`);
        return;
      }

      onSuccess?.(json);
      startTransition(() => {
        void refreshTree(session);
      });
    } catch {
      setError("That request failed before the server could respond. Check your connection and try again.");
    } finally {
      setBusyMessage(null);
    }
  }

  async function handleSavePerson(payload: Record<string, unknown>) {
    const endpoint = selectedPerson
      ? `/api/trees/${slug}/people/${selectedPerson.id}`
      : `/api/trees/${slug}/people`;
    const method = selectedPerson ? "PATCH" : "POST";

    await runAction(
      selectedPerson ? "Saving profile" : "Creating profile",
      () =>
        fetch(endpoint, {
          method,
          headers: {
            "content-type": "application/json",
            ...requestHeaders(),
          },
          body: JSON.stringify(payload),
        }),
      (responsePayload) => {
        const nextPerson = (responsePayload as { person?: { id: string } }).person;
        if (!selectedPerson && nextPerson?.id) {
          setStarterPreset(null);
          setSelectedPersonId(nextPerson.id);
        }
      },
    );
  }

  async function handleDeletePerson() {
    if (!selectedPerson) {
      return;
    }

    await runAction("Archiving profile", () =>
      fetch(`/api/trees/${slug}/people/${selectedPerson.id}`, {
        method: "DELETE",
        headers: requestHeaders(),
      }),
    );
  }

  async function handleClaim() {
    if (!selectedPerson || !session.editorToken) {
      return;
    }

    await runAction(
      "Claiming profile",
      () =>
        fetch(`/api/trees/${slug}/claim`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...requestHeaders(),
          },
          body: JSON.stringify({
            personId: selectedPerson.id,
            browserToken: session.editorToken,
            displayName: editorName || null,
          }),
        }),
      (payload) =>
        setClaimResult({
          ...(payload as Omit<ClaimResult, "personId">),
          personId: selectedPerson.id,
        }),
    );
  }

  async function handleUploadMedia(payload: {
    file?: File | null;
    externalUrl?: string;
    caption?: string;
    type: "PROFILE" | "GALLERY";
  }) {
    if (!selectedPerson) {
      return;
    }

    const formData = new FormData();
    formData.set("personId", selectedPerson.id);
    formData.set("type", payload.type);
    if (payload.caption) {
      formData.set("caption", payload.caption);
    }
    if (payload.externalUrl) {
      formData.set("externalUrl", payload.externalUrl);
    }
    if (payload.file) {
      formData.set("file", payload.file);
    }

    await runAction("Uploading media", () =>
      fetch(`/api/trees/${slug}/media`, {
        method: "POST",
        headers: requestHeaders(),
        body: formData,
      }),
    );
  }

  async function handleCreateRelationship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("Saving relationship", () =>
      fetch(`/api/trees/${slug}/relationships`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify(relationshipDraft),
      }),
    );
  }

  async function handleModeration(relationshipId: string, decision: "approve" | "reject") {
    await runAction(
      decision === "approve" ? "Approving change" : "Rejecting change",
      () =>
        fetch(`/api/trees/${slug}/moderation/${relationshipId}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...requestHeaders(),
          },
          body: JSON.stringify({ decision }),
        }),
    );
  }

  async function handleRollback(historyId: string) {
    await runAction("Rolling back change", () =>
      fetch(`/api/trees/${slug}/rollback`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify({ historyId }),
      }),
    );
  }

  async function handleReactivate() {
    await runAction("Reactivating tree", () =>
      fetch(`/api/trees/${slug}/reactivate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify({}),
      }),
    );
  }

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseAccessInput(accessCode);
    if (!parsed.token && !parsed.personalToken) {
      setError("Paste a valid owner, contributor, viewer, or personal share link.");
      return;
    }

    const next = {
      ...session,
      token: parsed.token,
      personalToken: parsed.personalToken,
    };
    setSession(next);
    storeSession(slug, {
      token: parsed.token,
      personalToken: parsed.personalToken,
    });
    setError(null);
    await refreshTree(next);
  }

  async function handleRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyMessage("Recovering personal link");
    setError(null);

    try {
      const response = await fetch(`/api/trees/${slug}/claim/recover`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          recoveryCode,
          browserToken: session.editorToken,
          displayName: editorName || null,
        }),
      });

      const json = (await response.json()) as { error?: string; personalLink?: string };
      if (!response.ok || !json.personalLink) {
        setError(json.error ?? "Recovery code was not accepted.");
        return;
      }

      const personalToken = personalTokenFromLink(json.personalLink);
      if (!personalToken) {
        setError("The recovery flow returned an invalid personal link.");
        return;
      }

      const next = {
        ...session,
        token: null,
        personalToken,
      };
      setSession(next);
      storeSession(slug, {
        token: null,
        personalToken,
      });
      await refreshTree(next);
    } catch {
      setError("The recovery request failed before the server could respond. Check your connection and try again.");
    } finally {
      setBusyMessage(null);
    }
  }

  function handleEditorNameSave() {
    storeEditorName(slug, editorName);
    startTransition(() => {
      void refreshTree(session);
    });
  }

  if (loading && !bundle) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4">
        <Card className="w-full max-w-xl text-center">
          <p className="text-lg font-semibold text-[var(--ink-strong)]">Opening the family tree...</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Connecting the secure link, loading relatives, and preparing both tree views.
          </p>
        </Card>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-6 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <Badge className="w-fit bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
            Stable private URL
          </Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">
            This family tree is locked until you add a share token or recover a personal link.
          </h1>
          <p className="text-base leading-8 text-[var(--ink-soft)]">
            Trees stay private by default. Paste an owner, contributor, or viewer token from your
            share link, or use a personal recovery code to reopen the profile you claimed before.
          </p>
          <div className="rounded-3xl border border-[color:var(--border-soft)] bg-white/70 p-4 text-sm text-[var(--ink-soft)]">
            The stable URL for this tree is
            <span className="mx-1 font-semibold text-[var(--ink-strong)]">{slug}</span>
            and it can be reused forever as long as the tree stays active.
          </div>
          {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
          <Link href="/" className="text-sm font-semibold text-[var(--brand-forest)]">
            Create a new family tree instead
          </Link>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
                <Lock className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--ink-strong)]">Use a share token</h2>
                <p className="text-sm text-[var(--ink-muted)]">
                  Paste the token from any owner, contributor, or viewer link.
                </p>
              </div>
            </div>
            <form className="space-y-3" onSubmit={handleUnlock}>
              <Input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="owner_xxx or contrib_xxx"
              />
              <Button type="submit" className="w-full">
                Unlock tree
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[color:rgba(227,182,97,0.18)] text-[var(--brand-forest)]">
                <ArchiveRestore className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--ink-strong)]">Recover a personal link</h2>
                <p className="text-sm text-[var(--ink-muted)]">
                  Use the recovery code from when you claimed your own profile.
                </p>
              </div>
            </div>
            <form className="space-y-3" onSubmit={handleRecovery}>
              <Input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="AB12-CD34-EF56-GH78"
              />
              <Input
                value={editorName}
                onChange={(event) => setEditorName(event.target.value)}
                placeholder="Your name on this device"
              />
              <Button type="submit" variant="secondary" className="w-full" disabled={Boolean(busyMessage)}>
                {busyMessage ?? "Recover personal edit access"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <Card className="mb-6 overflow-hidden p-0">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(227,182,97,0.28),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(107,143,84,0.2),_transparent_42%)]" />
            <div className="relative flex flex-col gap-6 p-6 md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{ROLE_LABELS[bundle.access.role ?? "VIEWER"] ?? "Private tree"}</Badge>
                    <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                      {bundle.people.length} people
                    </Badge>
                    <Badge className="bg-[color:rgba(227,182,97,0.16)] text-[#8D642A]">
                      {bundle.relationships.length} connections
                    </Badge>
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-5xl">
                      {bundle.tree.title}
                    </h1>
                    {bundle.tree.subtitle ? (
                      <p className="mt-2 text-base text-[var(--ink-soft)]">{bundle.tree.subtitle}</p>
                    ) : null}
                    {bundle.tree.description ? (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
                        {bundle.tree.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-muted)]" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name, city, or occupation"
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={viewMode}
                    onChange={(event) => setViewMode(event.target.value as WorkspaceViewMode)}
                    className={fieldClassName}
                  >
                    {VIEW_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setStarterPreset(null);
                      setSelectedPersonId(NEW_PERSON_ID);
                      setClaimResult(null);
                    }}
                    disabled={!canCreatePeople}
                  >
                    <Plus className="size-4" />
                    Add person
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={editorName}
                  onChange={(event) => setEditorName(event.target.value)}
                  placeholder="How should this browser appear in the edit history?"
                  className="max-w-md"
                />
                <Button variant="outline" onClick={handleEditorNameSave}>
                  Save browser identity
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearStoredSession(slug);
                    setStarterPreset(null);
                    setSelectedPersonId(null);
                    setClaimResult(null);
                    setError(null);
                    setBundle(null);
                    setSession({
                      token: null,
                      personalToken: null,
                      editorToken: getOrCreateEditorToken(slug),
                    });
                  }}
                >
                  Forget this link on this device
                </Button>
              </div>

              {bundle.access.isArchived ? (
                <div className="rounded-3xl border border-[color:rgba(227,182,97,0.4)] bg-[color:rgba(255,244,223,0.88)] p-4 text-sm text-[var(--ink-strong)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">This tree is archived after 24 months of inactivity.</p>
                      <p className="mt-1 text-[var(--ink-soft)]">
                        Owner links and admin recovery can reactivate it without losing data.
                      </p>
                    </div>
                    {bundle.access.role === "OWNER" ? (
                      <Button variant="secondary" onClick={handleReactivate}>
                        Reactivate tree
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
              {busyMessage ? (
                <p className="text-sm text-[var(--brand-forest)]">{busyMessage}...</p>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_420px]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
                    {viewMode === "artistic" ? "Artistic tree view" : "Classic diagram view"}
                  </h2>
                  <p className="text-sm text-[var(--ink-muted)]">
                    Click any person node to open the full profile editor.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                  <Compass className="size-4" />
                  Organic and readable from the same source of truth
                </div>
              </div>
              <FamilyFlow
                bundle={bundle}
                viewMode={viewMode}
                searchQuery={deferredSearch}
                selectedPersonId={selectedPersonId}
                canCreatePeople={canCreatePeople}
                onSelectPerson={(personId) => {
                  setStarterPreset(null);
                  setSelectedPersonId(personId);
                }}
                onSelectStarter={(preset) => {
                  setStarterPreset(preset);
                  setSelectedPersonId(NEW_PERSON_ID);
                  setClaimResult(null);
                }}
              />
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                      Connect relatives
                    </h3>
                    <p className="text-sm text-[var(--ink-muted)]">
                      Structural edits can be moderated before they go live.
                    </p>
                  </div>
                </div>
                <form className="space-y-3" onSubmit={handleCreateRelationship}>
                  <select
                    value={relationshipDraft.fromPersonId}
                    onChange={(event) =>
                      setRelationshipDraft((current) => ({
                        ...current,
                        fromPersonId: event.target.value,
                      }))
                    }
                    className={fieldClassName}
                    disabled={!canCreatePeople}
                  >
                    <option value="">From person</option>
                    {bundle.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {formatPersonName(person)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={relationshipDraft.type}
                    onChange={(event) =>
                      setRelationshipDraft((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className={fieldClassName}
                    disabled={!canCreatePeople}
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={relationshipDraft.toPersonId}
                    onChange={(event) =>
                      setRelationshipDraft((current) => ({
                        ...current,
                        toPersonId: event.target.value,
                      }))
                    }
                    className={fieldClassName}
                    disabled={!canCreatePeople}
                  >
                    <option value="">To person</option>
                    {bundle.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {formatPersonName(person)}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={relationshipDraft.note}
                    onChange={(event) =>
                      setRelationshipDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    disabled={!canCreatePeople}
                    placeholder="Optional note about this relationship"
                  />
                  <Button type="submit" className="w-full" disabled={!canCreatePeople}>
                    Save relationship
                  </Button>
                </form>
              </Card>

              {bundle.links ? (
                <ShareLinksCard links={bundle.links} />
              ) : (
                <Card className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[color:rgba(227,182,97,0.18)] text-[var(--brand-forest)]">
                      <Share2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                        Family member list
                      </h3>
                      <p className="text-sm text-[var(--ink-muted)]">
                        Select someone from the filtered results to open their profile.
                      </p>
                    </div>
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => {
                          setStarterPreset(null);
                          setSelectedPersonId(person.id);
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          selectedPersonId === person.id
                            ? "border-[color:var(--brand-amber)] bg-[color:rgba(255,248,234,0.88)]"
                            : "border-[color:var(--border-soft)] bg-white/70 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--ink-strong)]">
                              {formatPersonName(person)}
                            </p>
                            <p className="text-sm text-[var(--ink-muted)]">
                              {person.currentCity || person.occupation || "No extra details yet"}
                            </p>
                          </div>
                          {person.claimedBy ? <Badge>Claimed</Badge> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Moderation queue</h3>
                  <p className="text-sm text-[var(--ink-muted)]">
                    Pending structural edits appear here when contributor changes need review.
                  </p>
                </div>
                <div className="space-y-3">
                  {bundle.moderationQueue.length === 0 ? (
                    <p className="text-sm text-[var(--ink-muted)]">No pending structural edits right now.</p>
                  ) : (
                    bundle.moderationQueue.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-[color:var(--border-soft)] bg-white/70 p-4"
                      >
                        <p className="font-semibold text-[var(--ink-strong)]">
                          {item.type.toLowerCase()} relationship
                        </p>
                        <p className="mt-1 text-sm text-[var(--ink-muted)]">
                          {formatPersonName(
                            bundle.people.find((person) => person.id === item.fromPersonId) ?? {
                              firstName: "Unknown",
                            },
                          )}{" -> "}
                          {formatPersonName(
                            bundle.people.find((person) => person.id === item.toPersonId) ?? {
                              firstName: "Unknown",
                            },
                          )}
                        </p>
                        {item.note ? (
                          <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.note}</p>
                        ) : null}
                        {canModerate ? (
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => handleModeration(item.id, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleModeration(item.id, "reject")}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Recent edits</h3>
                  <p className="text-sm text-[var(--ink-muted)]">
                    Owner links can roll supported changes back from the activity log.
                  </p>
                </div>
                <div className="space-y-3">
                  {bundle.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-3xl border border-[color:var(--border-soft)] bg-white/72 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-[var(--ink-strong)]">{entry.summary}</p>
                          <p className="mt-1 text-sm text-[var(--ink-muted)]">
                            {entry.editorIdentity?.displayName || "Anonymous editor"} •{" "}
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {canModerate &&
                        !entry.rolledBackAt &&
                        isRollbackSupported(entry) ? (
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleRollback(entry.id)}
                          >
                            <RotateCcw className="size-4" />
                            Roll back
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <PersonEditorPanel
            person={selectedPerson}
            starterPreset={starterPreset}
            canEdit={Boolean(canEditSelected)}
            canDelete={Boolean(canDeleteSelected)}
            canClaim={Boolean(canClaimSelected)}
            isSaving={Boolean(busyMessage)}
            claimResult={claimResult}
            onSave={handleSavePerson}
            onDelete={handleDeletePerson}
            onClaim={handleClaim}
            onUpload={handleUploadMedia}
          />
        </div>
      </div>
    </div>
  );
}
