"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Sprout } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOrCreateDeviceToken } from "@/lib/client/local-identity";
import { readResponseJson } from "@/lib/client/response-json";
import { ShareLinksCard } from "@/components/tree/share-links-card";

type CreateResponse = {
  slug: string;
  links: {
    owner?: string | null;
    stable: string;
    edit: string;
    viewer: string | null;
  };
};

const starterNotes = [
  "Creates a private tree with a stable link",
  "Generates an edit link for family members",
  "Optionally adds a read-only view link",
];

const collaborationModes = [
  {
    value: "REVIEW_STRUCTURE",
    title: "Review structural edits",
    description: "Best when you want to approve new branches and relationships before they go live.",
  },
  {
    value: "OPEN",
    title: "Open collaboration",
    description: "Best when your family is small and you want faster, freer editing.",
  },
];

export function CreateTreeForm() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [moderationMode, setModerationMode] = useState("REVIEW_STRUCTURE");
  const [generateViewerLink, setGenerateViewerLink] = useState(true);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const ownerBrowserToken = getOrCreateDeviceToken();
      const response = await fetch("/api/trees", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          subtitle: subtitle || undefined,
          description: description || undefined,
          moderationMode,
          generateViewerLink,
          ...(ownerBrowserToken ? { ownerBrowserToken } : {}),
        }),
      });

      const json = await readResponseJson<CreateResponse & { error?: string }>(response);
      if (!response.ok) {
        setError(json?.error ?? "Could not create the tree.");
        return;
      }
      if (!json) {
        setError("The server returned an empty response.");
        return;
      }

      setResult(json);
    } catch {
      setError("The tree could not be created right now. Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const openTreeHref = result?.links.owner ?? (result ? `/tree/${result.slug}` : "/");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,350px)]">
      <Card className="overflow-hidden p-0">
        <div className="relative">
          <div className="relative grid gap-6 p-6 md:p-8">
            <div className="space-y-3">
              <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                New tree
              </Badge>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[var(--ink-strong)] md:text-3xl">
                  Start a shared family tree
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
                  Choose a title, decide how collaborative you want the structure to be, and the
                  app will generate the sharing links for you.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {starterNotes.map((note) => (
                  <div
                    key={note}
                    className="rounded-2xl border border-[color:var(--border-soft)] bg-white/76 px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--brand-forest)]" />
                      <span>{note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid gap-4 md:grid-cols-2"
              autoComplete="off"
            >
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Tree title
                </label>
                <Input
                  name="branchbook-tree-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="The Hawthorne family"
                  autoComplete="off"
                  required
                  minLength={2}
                />
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                  Use the family name, reunion name, or any title relatives will recognize.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Subtitle <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
                </label>
                <Input
                  name="branchbook-tree-subtitle"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  placeholder="A shared family story"
                  autoComplete="off"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Welcome note <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
                </label>
                <Textarea
                  name="branchbook-tree-welcome"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Invite relatives to add people, photos, and memories without creating accounts."
                  autoComplete="off"
                />
              </div>
              <div className="md:col-span-2 grid gap-4 rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-5">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[var(--ink-strong)]">
                    Collaboration
                  </h3>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">
                    Pick how carefully you want new family branches to be reviewed.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[var(--ink-strong)]">
                      Structural moderation
                    </label>
                    <div className="grid gap-3">
                      {collaborationModes.map((mode) => {
                        const isActive = moderationMode === mode.value;
                        return (
                          <button
                            key={mode.title}
                            type="button"
                            onClick={() => setModerationMode(mode.value)}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              isActive
                                ? "border-[color:rgba(42,74,47,0.3)] bg-[color:rgba(42,74,47,0.07)] shadow-[0_10px_24px_rgba(42,74,47,0.07)]"
                                : "border-[color:var(--border-soft)] bg-white/82 hover:border-[color:rgba(42,74,47,0.2)] hover:bg-white"
                            }`}
                            aria-pressed={isActive}
                          >
                            <p className="font-semibold text-[var(--ink-strong)]">{mode.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                              {mode.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerateViewerLink((current) => !current)}
                    className={`flex min-h-[140px] flex-col items-start justify-between rounded-2xl border px-4 py-4 text-left transition ${
                      generateViewerLink
                        ? "border-[color:rgba(42,74,47,0.3)] bg-[color:rgba(42,74,47,0.07)] shadow-[0_10px_24px_rgba(42,74,47,0.07)]"
                        : "border-[color:var(--border-soft)] bg-white/82 hover:border-[color:rgba(42,74,47,0.2)] hover:bg-white"
                    }`}
                    aria-pressed={generateViewerLink}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[var(--ink-strong)]">View-only link</p>
                      <p className="text-sm leading-6 text-[var(--ink-muted)]">
                        Helpful for relatives who should see the tree but not change it.
                      </p>
                    </div>
                    <Badge
                      className={
                        generateViewerLink
                          ? "bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]"
                          : ""
                      }
                    >
                      {generateViewerLink ? "Included" : "Not included"}
                    </Badge>
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSubmitting} className="w-full gap-2 px-5 sm:w-auto">
                  <Sprout className="size-4" />
                  {isSubmitting ? "Creating…" : "Create tree"}
                </Button>
                <p className="text-sm text-[var(--ink-muted)]">
                  You can invite relatives right after this.
                </p>
              </div>
              {error ? (
                <p className="md:col-span-2 text-sm text-[#9A4136]">{error}</p>
              ) : null}
            </form>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {result ? (
          <>
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
                  <CheckCircle2 className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Created</h3>
              </div>
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                Your tree is ready. Open it now, save your owner link, and then copy the right
                link for each family member.
              </p>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/78 px-4 py-3 text-sm text-[var(--ink-strong)]">
                  1. Save your owner link.
                </div>
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/78 px-4 py-3 text-sm text-[var(--ink-strong)]">
                  2. Open the tree and add the first person.
                </div>
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/78 px-4 py-3 text-sm text-[var(--ink-strong)]">
                  3. Share the edit or view-only link with relatives.
                </div>
              </div>
              {result.links.owner ? (
                <div className="rounded-xl border border-[color:rgba(227,182,97,0.45)] bg-[color:rgba(255,248,234,0.88)] p-4 text-sm text-[var(--ink-strong)]">
                  <p className="font-semibold">Save your owner link before sharing anything.</p>
                  <p className="mt-1 leading-6 text-[var(--ink-muted)]">
                    It is your full-control recovery link if you ever switch devices or get locked
                    out of local browser storage.
                  </p>
                </div>
              ) : null}
              <Link
                href={openTreeHref}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--brand-forest)]"
              >
                Open tree
                <ArrowRight className="size-4" />
              </Link>
            </Card>
            <ShareLinksCard links={result.links} />
          </>
        ) : (
          <>
            <Card className="space-y-4 bg-[color:var(--surface-muted)]">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                  What happens next
                </h3>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  After you press create, the app will do these things for you automatically.
                </p>
              </div>
              <div className="space-y-3">
                {starterNotes.map((note) => (
                  <div
                    key={note}
                    className="rounded-xl border border-[color:var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[var(--ink-strong)]"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--brand-forest)]" />
                      <span>{note}</span>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-[color:rgba(227,182,97,0.45)] bg-[color:rgba(255,248,234,0.72)] px-4 py-3 text-sm text-[var(--ink-strong)]">
                  Also gives you a private owner link to keep for full control later.
                </div>
              </div>
            </Card>

            <Card className="space-y-4 bg-[color:var(--surface-muted)]">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                  Which moderation setting should I choose?
                </h3>
              </div>
              <div className="space-y-3">
                {collaborationModes.map((mode) => (
                  <div
                    key={mode.title}
                    className="rounded-xl border border-[color:var(--border-soft)] bg-white/80 px-4 py-3"
                  >
                    <p className="font-semibold text-[var(--ink-strong)]">{mode.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                      {mode.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
