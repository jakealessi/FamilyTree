"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArchiveRestore,
  Loader2,
  Lock,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { TreeAccountPanel } from "@/components/auth-form";
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
import { readResponseJson } from "@/lib/client/response-json";
import {
  LIFE_STATUS_OPTIONS,
  ROLE_LABELS,
  RELATIONSHIP_OPTIONS,
} from "@/lib/shared/constants";
import { formatBranchLabel, formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

import { FamilyBracket } from "./family-bracket";

function fetchWithCred(input: RequestInfo | URL, init?: RequestInit) {
  return globalThis.fetch(input, { ...init, credentials: "include" });
}

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

type LifeStatusFilter = "ALL" | "UNKNOWN" | "LIVING" | "DECEASED";
type ClaimFilter = "ALL" | "CLAIMED" | "UNCLAIMED";

const NEW_PERSON_ID = "__new_person__";

function createRelationshipDraft(fromPersonId?: string | null) {
  return {
    fromPersonId: fromPersonId ?? "",
    toPersonId: "",
    type: "PARENT",
    note: "",
  };
}

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

function relationshipTypeLabel(type: string) {
  return (
    RELATIONSHIP_OPTIONS.find((option) => option.value === type)?.label ??
    type.toLowerCase().replace(/_/g, " ")
  );
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
  const [search, setSearch] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [editorName, setEditorName] = useState("");
  const [lifeStatusFilter, setLifeStatusFilter] = useState<LifeStatusFilter>("ALL");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [relationshipDraft, setRelationshipDraft] = useState(createRelationshipDraft());
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [nameGateOpen, setNameGateOpen] = useState(false);
  const [nameGateDraft, setNameGateDraft] = useState("");
  const deferredSearch = useDeferredValue(search);

  const branchOptions = bundle
    ? ["ALL", ...new Set(bundle.people.map((person) => person.branchKey ?? "UNASSIGNED"))]
    : ["ALL"];

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
    const canAttempt =
      Boolean(session.token) || Boolean(session.personalToken) || Boolean(session.editorToken);
    if (!canAttempt) {
      setLoading(false);
      setBundle(null);
      return;
    }

    void refreshTree({
      token: session.token,
      personalToken: session.personalToken,
      editorToken: session.editorToken,
    });
    // `refreshTree` intentionally reads the latest editor name and session state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.personalToken, session.token, session.editorToken]);

  const filteredPeople = !bundle
    ? []
    : (() => {
        const query = deferredSearch.trim().toLowerCase();
        return bundle.people.filter((person) =>
          {
            const matchesQuery =
              query.length === 0 ||
              [formatPersonName(person), person.currentCity, person.occupation]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
            const matchesLifeStatus =
              lifeStatusFilter === "ALL" || person.lifeStatus === lifeStatusFilter;
            const matchesClaim =
              claimFilter === "ALL" ||
              (claimFilter === "CLAIMED" ? Boolean(person.claimedBy) : !person.claimedBy);
            const effectiveBranchKey = person.branchKey ?? "UNASSIGNED";
            const matchesBranch =
              branchFilter === "ALL" || effectiveBranchKey === branchFilter;

            return matchesQuery && matchesLifeStatus && matchesClaim && matchesBranch;
          },
        );
      })();
  const filteredPersonIds = filteredPeople.map((person) => person.id);
  const filtersActive =
    lifeStatusFilter !== "ALL" || claimFilter !== "ALL" || branchFilter !== "ALL";
  const searchActive = deferredSearch.trim().length > 0;
  const viewNarrowed = filtersActive || searchActive;

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

  useEffect(() => {
    if (!bundle || !editingRelationshipId) {
      return;
    }

    const relationshipStillExists = bundle.relationships.some(
      (relationship) => relationship.id === editingRelationshipId,
    );

    if (!relationshipStillExists) {
      setEditingRelationshipId(null);
      setRelationshipDraft(createRelationshipDraft());
    }
  }, [bundle, editingRelationshipId]);

  useEffect(() => {
    if (bundle?.myEditor?.needsNamePrompt) {
      setNameGateOpen(true);
      setNameGateDraft((current) => current || getStoredEditorName(slug));
    } else {
      setNameGateOpen(false);
    }
  }, [bundle?.myEditor?.needsNamePrompt, slug]);

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
  const canManageExistingRelationships =
    bundle?.access.role === "OWNER" ||
    (bundle?.access.role === "CONTRIBUTOR" && bundle.tree.moderationMode === "OPEN");
  const relationshipScopePersonId =
    selectedPersonId && selectedPersonId !== NEW_PERSON_ID ? selectedPersonId : null;
  const visibleRelationships = bundle
    ? bundle.relationships.filter((relationship) =>
        relationshipScopePersonId
          ? relationship.fromPersonId === relationshipScopePersonId ||
            relationship.toPersonId === relationshipScopePersonId
          : true,
      )
    : [];

  async function refreshTree(nextSession: SessionState) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithCred(`/api/trees/${slug}`, {
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

      const json = await readResponseJson<TreeBundle & { error?: string }>(response);

      if (!response.ok) {
        setBundle(null);
        setError(json?.error ?? "This tree could not be opened.");
        return;
      }
      if (!json) {
        setBundle(null);
        setError("This tree could not be loaded (empty response).");
        return;
      }

      setBundle(json);

      if (
        nextSession.editorToken &&
        (json.access.role === "OWNER" ||
          json.access.role === "CONTRIBUTOR" ||
          json.access.role === "PERSONAL")
      ) {
        await fetchWithCred(`/api/trees/${slug}/identity`, {
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
        return false;
      }

      onSuccess?.(json);
      startTransition(() => {
        void refreshTree(session);
      });
      return true;
    } catch {
      setError("That request failed before the server could respond. Check your connection and try again.");
      return false;
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
        fetchWithCred(endpoint, {
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
      fetchWithCred(`/api/trees/${slug}/people/${selectedPerson.id}`, {
        method: "DELETE",
        headers: requestHeaders(),
      }),
    );
  }

  async function handleClaim() {
    if (!selectedPerson) {
      return;
    }

    if (!session.editorToken) {
      setError(
        "This browser could not create a local editor identity. Enable browser storage and try claiming the profile again.",
      );
      return;
    }

    await runAction(
      "Claiming profile",
      () =>
        fetchWithCred(`/api/trees/${slug}/claim`, {
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
      return false;
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

    return runAction("Uploading media", () =>
      fetchWithCred(`/api/trees/${slug}/media`, {
        method: "POST",
        headers: requestHeaders(),
        body: formData,
      }),
    );
  }

  async function handleCreateRelationship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const endpoint = editingRelationshipId
      ? `/api/trees/${slug}/relationships/${editingRelationshipId}`
      : `/api/trees/${slug}/relationships`;
    const method = editingRelationshipId ? "PATCH" : "POST";

    await runAction(editingRelationshipId ? "Updating relationship" : "Saving relationship", () =>
      fetchWithCred(endpoint, {
        method,
        headers: {
          "content-type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify(relationshipDraft),
      }),
      () => {
        setEditingRelationshipId(null);
        setRelationshipDraft(createRelationshipDraft(relationshipScopePersonId));
      },
    );
  }

  async function handleDeleteRelationship(relationshipId: string) {
    await runAction("Removing relationship", () =>
      fetchWithCred(`/api/trees/${slug}/relationships/${relationshipId}`, {
        method: "DELETE",
        headers: requestHeaders(),
      }),
    );
  }

  function startNewRelationship() {
    setEditingRelationshipId(null);
    setRelationshipDraft(createRelationshipDraft(relationshipScopePersonId));
  }

  function handleEditRelationship(relationship: TreeBundle["relationships"][number]) {
    setEditingRelationshipId(relationship.id);
    setRelationshipDraft({
      fromPersonId: relationship.fromPersonId,
      toPersonId: relationship.toPersonId,
      type: relationship.type,
      note: relationship.note ?? "",
    });
  }

  async function handleModeration(relationshipId: string, decision: "approve" | "reject") {
    await runAction(
      decision === "approve" ? "Approving change" : "Rejecting change",
      () =>
        fetchWithCred(`/api/trees/${slug}/moderation/${relationshipId}`, {
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
      fetchWithCred(`/api/trees/${slug}/rollback`, {
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
      fetchWithCred(`/api/trees/${slug}/reactivate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...requestHeaders(),
        },
        body: JSON.stringify({}),
      }),
    );
  }

  function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseAccessInput(accessCode);
    if (!parsed.token && !parsed.personalToken) {
      setError("Paste a valid edit link, view link, or personal token.");
      return;
    }

    const next = {
      ...session,
      token: parsed.token,
      personalToken: parsed.personalToken,
    };
    setLoading(true);
    setSession(next);
    storeSession(slug, {
      token: parsed.token,
      personalToken: parsed.personalToken,
    });
    setError(null);
  }

  async function handleRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyMessage("Recovering personal link");
    setError(null);

    try {
      const response = await fetchWithCred(`/api/trees/${slug}/claim/recover`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          recoveryCode,
          ...(session.editorToken ? { browserToken: session.editorToken } : {}),
          displayName: editorName || null,
        }),
      });

      const json = await readResponseJson<{ error?: string; personalLink?: string }>(response);
      if (!response.ok || !json?.personalLink) {
        setError(json?.error ?? "Recovery code was not accepted.");
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
      setLoading(true);
      setSession(next);
      storeSession(slug, {
        token: null,
        personalToken,
      });
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

  async function handleNameGateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nameGateDraft.trim();
    if (!name || !session.editorToken) {
      return;
    }
    setEditorName(name);
    storeEditorName(slug, name);
    setBusyMessage("Saving your name");
    setError(null);
    try {
      const response = await fetchWithCred(`/api/trees/${slug}/identity`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session.token ? { "x-tree-token": session.token } : {}),
          ...(session.personalToken ? { "x-personal-token": session.personalToken } : {}),
        },
        body: JSON.stringify({
          browserToken: session.editorToken,
          displayName: name,
        }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Could not save your name.");
        return;
      }
      setNameGateOpen(false);
      await refreshTree(session);
    } finally {
      setBusyMessage(null);
    }
  }

  function personNameForId(personId: string) {
    const person = bundle?.people.find((candidate) => candidate.id === personId);
    return formatPersonName(person ?? { firstName: "Unknown" });
  }

  if (loading && !bundle) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4">
        <Card className="w-full max-w-xl p-8 text-center">
          <div
            className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border-2 border-[color:var(--border-soft)] border-t-[var(--brand-forest)] ui-spinner"
            role="status"
            aria-busy="true"
            aria-live="polite"
          />
          <p className="text-lg font-semibold text-[var(--ink-strong)]">Loading…</p>
        </Card>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-6 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-strong)] md:text-3xl">
            Sign in to this tree
          </h1>
          <p className="font-mono text-sm text-[var(--ink-muted)]">{slug}</p>
          {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
          <Link href="/" className="text-sm font-semibold text-[var(--brand-forest)]">
            New tree
          </Link>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold text-[var(--ink-strong)]">Invite link</h2>
            <form className="space-y-3" onSubmit={handleUnlock}>
              <Input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="URL or token"
              />
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-[var(--ink-strong)]">Recovery code</h2>
            <form className="space-y-3" onSubmit={handleRecovery}>
              <Input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="AB12-CD34-EF56-GH78"
              />
              <Input
                value={editorName}
                onChange={(event) => setEditorName(event.target.value)}
                placeholder="Your name"
              />
              <Button type="submit" variant="secondary" className="w-full" disabled={Boolean(busyMessage)}>
                {busyMessage ?? "Recover"}
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
        <Card className="mb-6 p-6 md:p-8">
          <div className="flex flex-col gap-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-5xl">
                      {bundle.tree.title}
                    </h1>
                    {bundle.tree.subtitle ? (
                      <p className="mt-2 text-base text-[var(--ink-soft)]">{bundle.tree.subtitle}</p>
                    ) : null}
                    <p className="mt-3 text-sm text-[var(--ink-muted)]">
                      <span className="font-medium text-[var(--ink-strong)]">
                        {ROLE_LABELS[bundle.access.role ?? "VIEWER"] ?? "Private tree"}
                      </span>
                      <span aria-hidden> · </span>
                      {bundle.people.length} people
                      <span aria-hidden> · </span>
                      {bundle.relationships.length} links
                      <span aria-hidden> · </span>
                      {bundle.tree.moderationMode === "REVIEW_STRUCTURE"
                        ? "Edits reviewed"
                        : "Open collaboration"}
                      {bundle.access.role === "OWNER" && bundle.account?.linkedToUser ? (
                        <>
                          <span aria-hidden> · </span>
                          <span className="text-[var(--brand-forest)]">On your account</span>
                        </>
                      ) : null}
                    </p>
                    {bundle.tree.description ? (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
                        {bundle.tree.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-muted)]" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search"
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedPersonId(NEW_PERSON_ID);
                        setClaimResult(null);
                      }}
                      disabled={!canCreatePeople}
                      title={
                        canCreatePeople
                          ? "Create a new profile in this tree"
                          : "You need edit access (owner or collaborator link) to add people."
                      }
                    >
                      <Plus className="size-4" />
                      Add person
                    </Button>
                  </div>
                </div>

                  <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.75)] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    <Lock className="size-3.5 text-[var(--brand-forest)]" aria-hidden />
                    Your name
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <Input
                        value={editorName}
                        onChange={(event) => setEditorName(event.target.value)}
                        placeholder=""
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={handleEditorNameSave}>
                        Save name
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          clearStoredSession(slug);
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
                        Forget this device
                      </Button>
                    </div>
                    {bundle.access.role === "OWNER" && bundle.account ? (
                      <div className="border-t border-[color:var(--border-soft)] pt-4">
                        <TreeAccountPanel
                          slug={slug}
                          linkedToUser={bundle.account.linkedToUser}
                          onLinked={() => {
                            startTransition(() => {
                              void refreshTree(session);
                            });
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {bundle.access.isArchived ? (
                <div
                  className="rounded-lg border border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.03)] p-4 text-sm text-[var(--ink-strong)]"
                  role="status"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-3">
                      <ArchiveRestore
                        className="mt-0.5 size-5 shrink-0 text-[var(--ink-muted)]"
                        aria-hidden
                      />
                      <div>
                        <p className="font-semibold">Archived</p>
                      </div>
                    </div>
                    {bundle.access.role === "OWNER" ? (
                      <Button variant="secondary" onClick={handleReactivate}>
                        Reactivate tree
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="flex gap-3 rounded-lg border border-[#d4a59a] bg-[color:var(--state-danger-bg)] px-4 py-3 text-sm text-[color:var(--state-danger-text)]"
                >
                  <AlertCircle className="size-5 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              ) : null}
              {busyMessage ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--state-info-bg)] px-4 py-3 text-sm text-[var(--ink-strong)]"
                >
                  <Loader2 className="ui-spinner size-5 shrink-0 text-[var(--brand-forest)]" aria-hidden />
                  <span className="font-medium">{busyMessage}…</span>
                </div>
              ) : null}
              </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_420px]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Bracket</h2>
                <p className="text-sm text-[var(--ink-muted)]">
                  {viewNarrowed ? (
                    <>
                      Filtered: {filteredPeople.length} of {bundle.people.length}
                    </>
                  ) : (
                    <>{bundle.people.length} people</>
                  )}
                </p>
              </div>
              <div className="grid gap-3 border-t border-[color:var(--border-soft)] pt-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                <select
                  value={lifeStatusFilter}
                  onChange={(event) =>
                    setLifeStatusFilter(event.target.value as LifeStatusFilter)
                  }
                  className={fieldClassName}
                >
                  <option value="ALL">All life statuses</option>
                  {LIFE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={claimFilter}
                  onChange={(event) => setClaimFilter(event.target.value as ClaimFilter)}
                  className={fieldClassName}
                >
                  <option value="ALL">All claim states</option>
                  <option value="CLAIMED">Claimed only</option>
                  <option value="UNCLAIMED">Unclaimed only</option>
                </select>
                <select
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  className={fieldClassName}
                >
                  {branchOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "ALL" ? "All branches" : formatBranchLabel(option)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLifeStatusFilter("ALL");
                    setClaimFilter("ALL");
                    setBranchFilter("ALL");
                  }}
                  disabled={!filtersActive}
                >
                  Clear filters
                </Button>
              </div>
              <FamilyBracket
                bundle={bundle}
                visiblePersonIds={filteredPersonIds}
                selectedPersonId={selectedPersonId}
                canCreatePeople={canCreatePeople}
                onSelectPerson={(personId) => {
                  setSelectedPersonId(personId);
                }}
              />
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Relationships</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {relationshipScopePersonId ? (
                    <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                      Focused on {personNameForId(relationshipScopePersonId)}
                    </Badge>
                  ) : null}
                  {editingRelationshipId ? (
                    <Badge className="bg-[color:rgba(227,182,97,0.16)] text-[#8D642A]">
                      Editing an existing relationship
                    </Badge>
                  ) : (
                    <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                      Add a new connection
                    </Badge>
                  )}
                  {relationshipScopePersonId &&
                  relationshipDraft.fromPersonId !== relationshipScopePersonId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-2 text-xs"
                      onClick={() =>
                        setRelationshipDraft((current) => ({
                          ...current,
                          fromPersonId: relationshipScopePersonId,
                        }))
                      }
                      disabled={!canCreatePeople}
                    >
                      Use selected person as source
                    </Button>
                  ) : null}
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
                    placeholder="Note"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" className="flex-1" disabled={!canCreatePeople}>
                      {editingRelationshipId ? "Update relationship" : "Save relationship"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startNewRelationship}
                      disabled={!canCreatePeople}
                    >
                      {editingRelationshipId ? "Cancel edit" : "New relationship"}
                    </Button>
                  </div>
                </form>

                <div className="space-y-3 border-t border-[color:var(--border-soft)] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      Connections
                    </h4>
                    <Badge className="bg-[color:rgba(227,182,97,0.16)] text-[#8D642A]">
                      {visibleRelationships.length}
                    </Badge>
                  </div>

                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {visibleRelationships.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-white/60 p-4 text-sm text-[var(--ink-muted)]">
                        None in this view
                      </div>
                    ) : (
                      visibleRelationships.map((relationship) => (
                        <div
                          key={relationship.id}
                          className={`rounded-lg border p-4 transition ${
                            editingRelationshipId === relationship.id
                              ? "border-[color:var(--brand-amber)] bg-[color:rgba(255,247,231,0.9)]"
                              : "border-[color:var(--border-soft)] bg-white/72"
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                                {relationshipTypeLabel(relationship.type)}
                              </Badge>
                              <p className="text-sm font-semibold text-[var(--ink-strong)]">
                                {personNameForId(relationship.fromPersonId)}{" "}
                                <span className="text-[var(--ink-muted)]">to</span>{" "}
                                {personNameForId(relationship.toPersonId)}
                              </p>
                            </div>

                            {relationship.note ? (
                              <p className="text-sm text-[var(--ink-soft)]">{relationship.note}</p>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              {canManageExistingRelationships ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handleEditRelationship(relationship)}
                                  >
                                    <PencilLine className="size-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="gap-2 text-[#9A4136] hover:bg-[rgba(154,65,54,0.08)] hover:text-[#9A4136]"
                                    onClick={() => handleDeleteRelationship(relationship.id)}
                                  >
                                    <Trash2 className="size-4" />
                                    Remove
                                  </Button>
                                </>
                              ) : (
                                <div className="rounded-full bg-[color:rgba(42,74,47,0.06)] px-3 py-2 text-xs font-medium text-[var(--ink-muted)]">
                                  {bundle.access.role === "CONTRIBUTOR" ? "Pending approval" : "View only"}
                                </div>
                              )}

                              {editingRelationshipId === relationship.id ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="gap-2"
                                  onClick={startNewRelationship}
                                >
                                  <X className="size-4" />
                                  Stop editing
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {bundle.links ? (
                <ShareLinksCard links={bundle.links} />
              ) : (
                <Card className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[color:rgba(227,182,97,0.18)] text-[var(--brand-forest)]">
                      <Share2 className="size-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--ink-strong)]">People</h3>
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {filteredPeople.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] bg-white/60 p-4 text-sm text-[var(--ink-muted)]">
                        No matches
                      </div>
                    ) : (
                      filteredPeople.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            setSelectedPersonId(person.id);
                          }}
                          className={`w-full rounded-lg border px-4 py-3 text-left transition ${
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
                              {person.currentCity || person.occupation ? (
                                <p className="text-sm text-[var(--ink-muted)]">
                                  {person.currentCity || person.occupation}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              {person.claimedBy ? <Badge>Claimed</Badge> : null}
                              {person.branchKey ? (
                                <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                                  {formatBranchLabel(person.branchKey)}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </Card>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Moderation</h3>
                <div className="space-y-3">
                  {bundle.moderationQueue.length === 0 ? (
                    <p className="text-sm text-[var(--ink-muted)]">Empty</p>
                  ) : (
                    bundle.moderationQueue.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 p-4"
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
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Activity</h3>
                <div className="space-y-3">
                  {bundle.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-[color:var(--border-soft)] bg-white/72 p-4"
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

      {nameGateOpen && bundle?.myEditor?.needsNamePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <Card className="w-full max-w-md space-y-4 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Your name</h2>
            <form className="space-y-3" onSubmit={handleNameGateSubmit}>
              <Input
                value={nameGateDraft}
                onChange={(event) => setNameGateDraft(event.target.value)}
                autoFocus
                required
              />
              <Button type="submit" className="w-full" disabled={Boolean(busyMessage)}>
                {busyMessage ?? "Continue"}
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
