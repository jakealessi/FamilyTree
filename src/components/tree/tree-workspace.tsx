"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArchiveRestore,
  Info,
  Loader2,
  Lock,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
  Users,
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
  getOrCreateEditorToken,
  getStoredEditorName,
  hasLocalStorageAccess,
  getStoredSession,
  resetTreeDeviceAccess,
  storeEditorName,
  storeSession,
} from "@/lib/client/local-identity";
import { readResponseJson } from "@/lib/client/response-json";
import { LIFE_STATUS_OPTIONS, ROLE_LABELS } from "@/lib/shared/constants";
import { formatPersonName } from "@/lib/shared/utils";
import type { TreeBundle } from "@/types/family-tree";

import { FamilyBracket } from "./family-bracket";
import { structuralChildren, structuralParentId } from "@/lib/shared/bracket-layout";

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
  const router = useRouter();
  const pathname = usePathname();
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
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [pendingChildId, setPendingChildId] = useState<string | null>(null);
  const [pendingSiblingId, setPendingSiblingId] = useState<string | null>(null);
  const [pendingPeerId, setPendingPeerId] = useState<string | null>(null);
  const [personEditorOpen, setPersonEditorOpen] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [nameGateOpen, setNameGateOpen] = useState(false);
  const [nameGateDraft, setNameGateDraft] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if ((!initialToken && !initialPersonalToken) || !hasLocalStorageAccess()) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const hadSensitiveParams =
      params.has("token") || params.has("personal") || params.has("editorToken");

    if (!hadSensitiveParams) {
      return;
    }

    params.delete("token");
    params.delete("personal");
    params.delete("editorToken");
    const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [initialPersonalToken, initialToken, pathname, router]);

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

            return matchesQuery && matchesLifeStatus && matchesClaim;
          },
        );
      })();
  const filteredPersonIds = filteredPeople.map((person) => person.id);
  const filtersActive = lifeStatusFilter !== "ALL" || claimFilter !== "ALL";
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
  const canEditInModal =
    selectedPersonId === NEW_PERSON_ID
      ? Boolean(canCreatePeople)
      : Boolean(canEditSelected);
  const selectedPersonForWorkspace =
    selectedPerson && (!viewNarrowed || filteredPersonIds.includes(selectedPerson.id))
      ? selectedPerson
      : null;
  const selectedParentId =
    bundle && selectedPersonForWorkspace
      ? structuralParentId(bundle, selectedPersonForWorkspace.id)
      : null;
  const selectedChildCount =
    bundle && selectedPersonForWorkspace
      ? structuralChildren(bundle, selectedPersonForWorkspace.id).length
      : 0;
  const activeStep = personEditorOpen ? 3 : selectedPersonForWorkspace ? 2 : 1;
  const accessSummary =
    bundle?.access.role === "OWNER"
      ? "You can add people, change details, and manage sharing."
      : bundle?.access.role === "CONTRIBUTOR"
        ? "You can add people and update family details."
      : bundle?.access.role === "PERSONAL"
        ? "You can update the profile linked to you."
        : "You can look around, but you need an edit link to make changes.";
  const actionTileClassName =
    "min-h-[112px] w-full flex-col items-start justify-between gap-3 whitespace-normal rounded-[22px] px-4 py-4 text-left";
  const mobileActionClassName =
    "min-h-[78px] flex-col items-start justify-between gap-1 whitespace-normal rounded-2xl px-3 py-3 text-left text-sm";

  function openNewPersonEditor(context?: {
    parentPersonId?: string | null;
    childPersonId?: string | null;
    siblingPersonId?: string | null;
    peerPersonId?: string | null;
  }) {
    clearPendingCreateContext();
    setPendingParentId(context?.parentPersonId ?? null);
    setPendingChildId(context?.childPersonId ?? null);
    setPendingSiblingId(context?.siblingPersonId ?? null);
    setPendingPeerId(context?.peerPersonId ?? null);
    setSelectedPersonId(NEW_PERSON_ID);
    setPersonEditorOpen(true);
    setClaimResult(null);
  }

  function openExistingPersonEditor(personId: string) {
    clearPendingCreateContext();
    setSelectedPersonId(personId);
    setPersonEditorOpen(true);
  }

  function clearPendingCreateContext() {
    setPendingParentId(null);
    setPendingChildId(null);
    setPendingSiblingId(null);
    setPendingPeerId(null);
  }

  function closePersonEditor() {
    setPersonEditorOpen(false);
    clearPendingCreateContext();
    if (selectedPersonId === NEW_PERSON_ID && bundle) {
      const personIds = new Set(bundle.people.map((person) => person.id));
      const fallback =
        (bundle.access.claimedPersonId && personIds.has(bundle.access.claimedPersonId)
          ? bundle.access.claimedPersonId
          : null) ?? bundle.people[0]?.id ?? null;
      setSelectedPersonId(fallback);
    }
  }

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
        if (
          response.status === 401 &&
          !nextSession.token &&
          !nextSession.personalToken
        ) {
          setError(null);
          return;
        }
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

    const body: Record<string, unknown> = { ...payload };
    if (!selectedPerson && pendingParentId) {
      body.parentPersonId = pendingParentId;
    }
    if (!selectedPerson && pendingChildId) {
      body.childPersonId = pendingChildId;
    }

    await runAction(
      selectedPerson ? "Saving profile" : "Creating profile",
      () =>
        fetchWithCred(endpoint, {
          method,
          headers: {
            "content-type": "application/json",
            ...requestHeaders(),
          },
          body: JSON.stringify(body),
        }),
      (responsePayload) => {
        const nextPerson = (responsePayload as { person?: { id: string } }).person;
        if (!selectedPerson && nextPerson?.id) {
          setSelectedPersonId(nextPerson.id);
          clearPendingCreateContext();
          setPersonEditorOpen(false);
        }
      },
    );
  }

  async function handleDeletePerson() {
    if (!selectedPerson) {
      return;
    }

    await runAction(
      "Archiving profile",
      () =>
        fetchWithCred(`/api/trees/${slug}/people/${selectedPerson.id}`, {
          method: "DELETE",
          headers: requestHeaders(),
        }),
      () => {
        setPersonEditorOpen(false);
      },
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
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Opening the tree and checking what this link is allowed to do.
          </p>
        </Card>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="mx-auto grid min-h-[72vh] max-w-6xl items-center gap-5 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-6 p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            Private tree access
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-strong)] md:text-3xl">
            Open this family tree
          </h1>
          <p className="text-sm leading-7 text-[var(--ink-muted)]">
            No account is needed. Paste the family link you were given, or use your recovery code
            to get back to your own profile.
          </p>
          <p className="font-mono text-sm text-[var(--ink-muted)]">{slug}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/78 px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]">
              If a relative sent you a link, paste it on the right.
            </div>
            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/78 px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]">
              If you claimed your own profile before, use your recovery code instead.
            </div>
          </div>
          {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
          <Link href="/" className="text-sm font-semibold text-[var(--brand-forest)]">
            Start a new family tree
          </Link>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3 p-6">
            <h2 className="font-semibold text-[var(--ink-strong)]">Open with a family link</h2>
            <p className="text-sm text-[var(--ink-muted)]">
              This is the link a relative shared with you.
            </p>
            <form className="space-y-3" onSubmit={handleUnlock}>
              <Input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Paste an invite link or token"
              />
              <Button type="submit" className="w-full">
                Open this tree
              </Button>
            </form>
          </Card>

          <Card className="space-y-3 bg-[color:var(--surface-muted)] p-6">
            <h2 className="font-semibold text-[var(--ink-strong)]">Use your own recovery code</h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Use this if you already claimed a profile and want to get back in on this device.
            </p>
            <form className="space-y-3" onSubmit={handleRecovery}>
              <Input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="AB12-CD34-EF56-GH78"
              />
              <Input
                value={editorName}
                onChange={(event) => setEditorName(event.target.value)}
                placeholder="Your name as family will see it"
              />
              <Button type="submit" variant="secondary" className="w-full" disabled={Boolean(busyMessage)}>
                {busyMessage ?? "Open my profile again"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 md:pb-16">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <Card className="mb-6 overflow-hidden p-0">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    Private tree dashboard
                  </p>
                  <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-5xl">
                    {bundle.tree.title}
                  </h1>
                  {bundle.tree.subtitle ? (
                    <p className="mt-2 text-base text-[var(--ink-soft)]">{bundle.tree.subtitle}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                      {ROLE_LABELS[bundle.access.role ?? "VIEWER"] ?? "Private tree"}
                    </Badge>
                    <Badge>
                      {bundle.tree.moderationMode === "REVIEW_STRUCTURE"
                        ? "Edits reviewed"
                        : "Open collaboration"}
                    </Badge>
                    {bundle.access.role === "OWNER" && bundle.account?.linkedToUser ? (
                      <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                        On your account
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
                    {accessSummary}
                  </p>
                  {bundle.tree.description ? (
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
                      {bundle.tree.description}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      People
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
                      {bundle.people.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      Connections
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
                      {bundle.relationships.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      Access
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--ink-strong)]">
                      {ROLE_LABELS[bundle.access.role ?? "VIEWER"] ?? "Private tree"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-muted)]" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search people, places, or details"
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 md:w-full"
                    onClick={() => openNewPersonEditor()}
                    disabled={!canCreatePeople}
                    title={
                      canCreatePeople
                        ? "Create a new profile in this tree"
                        : "You need edit access (owner or collaborator link) to add people."
                    }
                  >
                    <Plus className="size-4" />
                    Add a person
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 xl:border-l xl:border-t-0">
              <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-white/78 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                  <Lock className="size-3.5 text-[var(--brand-forest)]" aria-hidden />
                  How your changes will appear
                </div>
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    Family members will see this name next to changes you make. It only saves on
                    this device.
                  </p>
                  <Input
                    value={editorName}
                    onChange={(event) => setEditorName(event.target.value)}
                    placeholder="e.g. Jane on this iPad"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleEditorNameSave}>
                      Save display name
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const nextEditorToken = resetTreeDeviceAccess(slug);
                        setSelectedPersonId(null);
                        setClaimResult(null);
                        setError(null);
                        setBundle(null);
                        setEditorName("");
                        setSession({
                          token: null,
                          personalToken: null,
                          editorToken: nextEditorToken,
                        });
                      }}
                    >
                      Remove access from this device
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
          </div>
        </Card>

        <div className="mb-6 space-y-3">
          {bundle.access.isArchived ? (
            <div
              className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.03)] p-4 text-sm text-[var(--ink-strong)]"
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
              className="flex gap-3 rounded-2xl border border-[#d4a59a] bg-[color:var(--state-danger-bg)] px-4 py-3 text-sm text-[color:var(--state-danger-text)]"
            >
              <AlertCircle className="size-5 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          ) : null}
          {busyMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--state-info-bg)] px-4 py-3 text-sm text-[var(--ink-strong)]"
            >
              <Loader2 className="ui-spinner size-5 shrink-0 text-[var(--brand-forest)]" aria-hidden />
              <span className="font-medium">{busyMessage}…</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color:var(--border-soft)] pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    Main workspace
                  </p>
                  <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Build the tree</h2>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Follow the next step shown below. You can do this one relative at a time.
                  </p>
                </div>
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
              <div className="grid gap-3 lg:grid-cols-3">
                <div
                  className={`rounded-2xl border p-4 ${
                    activeStep === 1
                      ? "border-[color:rgba(227,182,97,0.7)] bg-[color:rgba(255,248,234,0.88)]"
                      : "border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.72)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[color:rgba(42,74,47,0.08)] text-sm font-semibold text-[var(--brand-forest)]">
                      1
                    </div>
                    {activeStep === 1 ? (
                      <Badge className="bg-[color:rgba(227,182,97,0.2)] text-[#8D642A]">Now</Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[var(--ink-strong)]">
                    Pick a person
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    Tap any person in the tree or the people list below.
                  </p>
                </div>
                <div
                  className={`rounded-2xl border p-4 ${
                    activeStep === 2
                      ? "border-[color:rgba(227,182,97,0.7)] bg-[color:rgba(255,248,234,0.88)]"
                      : "border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.72)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[color:rgba(42,74,47,0.08)] text-sm font-semibold text-[var(--brand-forest)]">
                      2
                    </div>
                    {activeStep === 2 ? (
                      <Badge className="bg-[color:rgba(227,182,97,0.2)] text-[#8D642A]">Now</Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[var(--ink-strong)]">
                    Choose what to add
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    Add a parent, sibling, child, or another top-level branch.
                  </p>
                </div>
                <div
                  className={`rounded-2xl border p-4 ${
                    activeStep === 3
                      ? "border-[color:rgba(227,182,97,0.7)] bg-[color:rgba(255,248,234,0.88)]"
                      : "border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.72)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[color:rgba(42,74,47,0.08)] text-sm font-semibold text-[var(--brand-forest)]">
                      3
                    </div>
                    {activeStep === 3 ? (
                      <Badge className="bg-[color:rgba(227,182,97,0.2)] text-[#8D642A]">Now</Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[var(--ink-strong)]">
                    Save only the basics
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    A first name is enough. Everything else can wait until later.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-4">
                <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-strong)]">Filter the view</p>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      Narrow the tree if you need a simpler list to work from.
                    </p>
                  </div>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLifeStatusFilter("ALL");
                      setClaimFilter("ALL");
                    }}
                    disabled={!filtersActive}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.74)] p-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      Step 2: Build from here
                    </p>
                    <h3 className="text-xl font-semibold text-[var(--ink-strong)]">
                      {selectedPersonForWorkspace
                        ? formatPersonName(selectedPersonForWorkspace)
                        : filteredPeople.length === 0
                          ? "No people match your search"
                          : "Tap someone to begin"}
                    </h3>
                    <p className="text-sm leading-6 text-[var(--ink-muted)]">
                      {selectedPersonForWorkspace
                        ? selectedParentId
                          ? "This person already has a parent, so the easiest next steps are adding a sibling, adding a child, or opening their profile."
                          : "This person does not have a parent link yet, so you can add one above them or start another top-level branch nearby."
                        : filteredPeople.length === 0
                          ? "Clear the search or filters to bring people back into view."
                          : "Tap any person card once. As soon as you do, the next buttons will tell you exactly where the new relative will go."}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedPersonForWorkspace ? (
                      <>
                        <Badge>{selectedParentId ? "Has parent link" : "Top-level branch"}</Badge>
                        <Badge>
                          {selectedChildCount} direct {selectedChildCount === 1 ? "child" : "children"}
                        </Badge>
                        {selectedPersonForWorkspace.claimedBy ? <Badge>Claimed</Badge> : null}
                      </>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={actionTileClassName}
                      onClick={() =>
                        selectedPersonForWorkspace
                          ? openNewPersonEditor({ childPersonId: selectedPersonForWorkspace.id })
                          : undefined
                      }
                      disabled={!canCreatePeople || !selectedPersonForWorkspace || Boolean(selectedParentId)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowUp className="size-4" />
                        Add parent
                      </span>
                      <span className="text-xs font-normal leading-5 text-[var(--ink-muted)]">
                        Place someone above this person.
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={actionTileClassName}
                      onClick={() =>
                        selectedPersonForWorkspace
                          ? selectedParentId
                            ? openNewPersonEditor({
                                parentPersonId: selectedParentId,
                                siblingPersonId: selectedPersonForWorkspace.id,
                              })
                            : openNewPersonEditor({ peerPersonId: selectedPersonForWorkspace.id })
                          : undefined
                      }
                      disabled={!canCreatePeople || !selectedPersonForWorkspace}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Users className="size-4" />
                        {selectedParentId ? "Add sibling" : "Add top-level person"}
                      </span>
                      <span className="text-xs font-normal leading-5 text-[var(--ink-muted)]">
                        {selectedParentId
                          ? "Place someone beside this person."
                          : "Start another branch at the top of the tree."}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={actionTileClassName}
                      onClick={() =>
                        selectedPersonForWorkspace
                          ? openNewPersonEditor({ parentPersonId: selectedPersonForWorkspace.id })
                          : undefined
                      }
                      disabled={!canCreatePeople || !selectedPersonForWorkspace}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowDown className="size-4" />
                        Add child
                      </span>
                      <span className="text-xs font-normal leading-5 text-[var(--ink-muted)]">
                        Place someone below this person.
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className={actionTileClassName}
                      onClick={() =>
                        selectedPersonForWorkspace
                          ? openExistingPersonEditor(selectedPersonForWorkspace.id)
                          : undefined
                      }
                      disabled={!selectedPersonForWorkspace}
                    >
                      <span className="inline-flex items-center gap-2">
                        <PencilLine className="size-4" />
                        {canEditSelected ? "Edit profile" : "Open profile"}
                      </span>
                      <span className="text-xs font-normal leading-5 text-[var(--ink-muted)]">
                        {canEditSelected
                          ? "Add dates, places, photos, and memories."
                          : "Read details and view photos."}
                      </span>
                    </Button>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
                    Tip: if you are not sure what to do next, just tap one person first. The tree
                    works best one relative at a time.
                  </p>
                </div>
                <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.72)] p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    <Info className="size-4 text-[var(--brand-forest)]" />
                    Common situations
                  </div>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--ink-muted)]">
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 p-4">
                      <p className="font-semibold text-[var(--ink-strong)]">
                        I am not sure where to start
                      </p>
                      <p className="mt-1">
                        Use the people list below, tap one name once, then follow the action
                        buttons that appear for that person.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 p-4">
                      <p className="font-semibold text-[var(--ink-strong)]">
                        I only know a little
                      </p>
                      <p className="mt-1">
                        Add the first name now. You can come back later for everything else.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 p-4">
                      <p className="font-semibold text-[var(--ink-strong)]">
                        I want to add a sibling
                      </p>
                      <p className="mt-1">
                        Select the person first. If they already have a parent in the tree, use
                        “Add sibling.” If not, use “Add top-level person.”
                      </p>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-white/70 p-4">
                      <p className="font-semibold text-[var(--ink-strong)]">I made a mistake</p>
                      <p className="mt-1">
                        Owners can review changes and roll back structural edits later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <FamilyBracket
                bundle={bundle}
                visiblePersonIds={filteredPersonIds}
                selectedPersonId={selectedPersonId}
                canCreatePeople={canCreatePeople}
                onSelectPerson={(personId) => {
                  setSelectedPersonId(personId);
                }}
                onEditPerson={(personId) => {
                  openExistingPersonEditor(personId);
                }}
                onAddPerson={({ parentPersonId, childPersonId, siblingPersonId, peerPersonId }) => {
                  openNewPersonEditor({
                    parentPersonId,
                    childPersonId,
                    siblingPersonId,
                    peerPersonId,
                  });
                }}
              />
            </Card>

            <div
              className={`grid gap-6 ${
                bundle.links ? "xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]" : ""
              }`}
            >
              <Card className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[color:rgba(227,182,97,0.18)] text-[var(--brand-forest)]">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--ink-strong)]">People</h3>
                      <p className="text-sm text-[var(--ink-muted)]">
                        Tap a row once to focus that person in the tree.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--ink-muted)]">{filteredPeople.length} shown</p>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredPeople.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-white/60 p-4 text-sm text-[var(--ink-muted)]">
                      No matches. Clear the filters or search to see more people again.
                    </div>
                  ) : (
                    filteredPeople.map((person) => {
                      const canEditPerson =
                        bundle.access.role === "OWNER" ||
                        bundle.access.role === "CONTRIBUTOR" ||
                        (bundle.access.role === "PERSONAL" &&
                          person.id === bundle.access.claimedPersonId);

                      return (
                        <div
                          key={person.id}
                          className={`rounded-2xl border px-4 py-3 transition ${
                            selectedPersonId === person.id
                              ? "border-[color:var(--brand-amber)] bg-[color:rgba(255,248,234,0.88)]"
                              : "border-[color:var(--border-soft)] bg-white/70 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedPersonId(person.id)}
                              className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                            >
                              <div className="flex items-center gap-2">
                                <p className="truncate font-semibold text-[var(--ink-strong)]">
                                  {formatPersonName(person)}
                                </p>
                                {selectedPersonId === person.id ? <Badge>Selected</Badge> : null}
                                {person.claimedBy ? <Badge>Claimed</Badge> : null}
                              </div>
                              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                                {selectedPersonId === person.id
                                  ? "Selected. New relatives will branch from here."
                                  : person.currentCity ||
                                    person.occupation ||
                                    "Tap this row to work from this person"}
                              </p>
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              className="whitespace-nowrap px-3"
                              onClick={() => openExistingPersonEditor(person.id)}
                            >
                              {canEditPerson ? "Edit profile" : "Open profile"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {bundle.links ? <ShareLinksCard links={bundle.links} /> : null}
            </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Moderation</h3>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    Review pending structural edits and decide which branch changes should stick.
                  </p>
                </div>
                <div className="space-y-3">
                  {bundle.moderationQueue.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] bg-white/70 p-4 text-sm text-[var(--ink-muted)]">
                      Nothing is waiting for review.
                    </div>
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
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Activity</h3>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    A simple timeline of profile edits, relationship changes, and rollbacks.
                  </p>
                </div>
                <div className="space-y-3">
                  {bundle.history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] bg-white/70 p-4 text-sm text-[var(--ink-muted)]">
                      No activity yet.
                    </div>
                  ) : (
                    bundle.history.map((entry) => (
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
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>

      {personEditorOpen && bundle ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8 md:py-12">
          <button
            type="button"
            aria-label="Close profile editor"
            className="fixed inset-0 cursor-default bg-transparent"
            onClick={closePersonEditor}
          />
          <Card className="relative z-10 w-full max-w-2xl border-[color:var(--border-soft)] p-0 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-soft)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {selectedPersonId === NEW_PERSON_ID
                    ? pendingSiblingId
                      ? `Add a sibling of ${formatPersonName(
                          bundle.people.find((person) => person.id === pendingSiblingId) ?? {
                            firstName: "this person",
                          },
                        )}`
                    : pendingPeerId
                      ? `Add another top-level person near ${formatPersonName(
                          bundle.people.find((person) => person.id === pendingPeerId) ?? {
                            firstName: "this person",
                          },
                        )}`
                      : pendingChildId
                        ? `Add a parent for ${formatPersonName(
                            bundle.people.find((person) => person.id === pendingChildId) ?? {
                              firstName: "this person",
                            },
                          )}`
                        : pendingParentId
                          ? `Add a child for ${formatPersonName(
                              bundle.people.find((person) => person.id === pendingParentId) ?? {
                                firstName: "this person",
                              },
                            )}`
                          : "Add someone"
                  : formatPersonName(selectedPerson ?? { firstName: "Profile" })}
              </h2>
              <Button type="button" variant="ghost" className="gap-2 px-3 py-2 text-sm" onClick={closePersonEditor}>
                <X className="size-4" />
                Close
              </Button>
            </div>
            <div className="max-h-[min(85vh,880px)] overflow-y-auto px-2 pb-4 pt-2 md:px-4">
              {selectedPersonId === NEW_PERSON_ID ? (
                <div className="px-3 pb-2 pt-1 text-sm text-[var(--ink-muted)]">
                  {pendingSiblingId
                    ? "This new profile will be placed beside the selected person under the same parent."
                    : pendingPeerId
                      ? "This new profile will start as another top-level branch in the tree."
                      : pendingChildId
                        ? "This new profile will be linked as a parent above the selected person."
                        : pendingParentId
                          ? "This new profile will be linked as a child below the selected person."
                          : "Create a new profile anywhere in this tree."}
                </div>
              ) : null}
              <PersonEditorPanel
                person={selectedPerson}
                canEdit={canEditInModal}
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
          </Card>
        </div>
      ) : null}

      {nameGateOpen && bundle?.myEditor?.needsNamePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <Card className="w-full max-w-md space-y-4 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              Tell family who is editing
            </h2>
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              This name appears next to your changes so relatives know who added or updated
              something.
            </p>
            <form className="space-y-3" onSubmit={handleNameGateSubmit}>
              <Input
                value={nameGateDraft}
                onChange={(event) => setNameGateDraft(event.target.value)}
                placeholder="e.g. Jane"
                autoFocus
                required
              />
              <Button type="submit" className="w-full" disabled={Boolean(busyMessage)}>
                {busyMessage ?? "Save name and continue"}
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      {selectedPersonForWorkspace && !personEditorOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border-soft)] bg-[color:rgba(248,244,236,0.96)] px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
          <div className="mx-auto max-w-[1440px]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Working on
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--ink-strong)]">
              {formatPersonName(selectedPersonForWorkspace)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={mobileActionClassName}
                onClick={() => openExistingPersonEditor(selectedPersonForWorkspace.id)}
              >
                <span className="inline-flex items-center gap-2">
                  <PencilLine className="size-4" />
                  {canEditSelected ? "Edit" : "Open"}
                </span>
                <span className="text-xs font-normal leading-4 text-[var(--ink-muted)]">
                  {canEditSelected ? "Add details" : "See details"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={mobileActionClassName}
                onClick={() => openNewPersonEditor({ parentPersonId: selectedPersonForWorkspace.id })}
                disabled={!canCreatePeople}
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowDown className="size-4" />
                  Child
                </span>
                <span className="text-xs font-normal leading-4 text-[var(--ink-muted)]">
                  Add below
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={mobileActionClassName}
                onClick={() =>
                  selectedParentId
                    ? openNewPersonEditor({
                        parentPersonId: selectedParentId,
                        siblingPersonId: selectedPersonForWorkspace.id,
                      })
                    : openNewPersonEditor({ peerPersonId: selectedPersonForWorkspace.id })
                }
                disabled={!canCreatePeople}
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="size-4" />
                  {selectedParentId ? "Sibling" : "Top level"}
                </span>
                <span className="text-xs font-normal leading-4 text-[var(--ink-muted)]">
                  {selectedParentId ? "Add beside" : "New branch"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={mobileActionClassName}
                onClick={() => openNewPersonEditor({ childPersonId: selectedPersonForWorkspace.id })}
                disabled={!canCreatePeople || Boolean(selectedParentId)}
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowUp className="size-4" />
                  Parent
                </span>
                <span className="text-xs font-normal leading-4 text-[var(--ink-muted)]">
                  Add above
                </span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
