"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { getOrCreateDeviceToken } from "@/lib/client/local-identity";
import { readResponseJson } from "@/lib/client/response-json";
import { ShareLinksCard } from "@/components/tree/share-links-card";

type CreateResponse = {
  slug: string;
  links: {
    stable: string;
    edit: string;
    viewer: string | null;
    legacyOwner?: string;
  };
};

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

  const openTreeHref = result ? `/tree/${result.slug}` : "/";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <Card className="overflow-hidden p-0">
        <div className="relative">
          <div className="relative grid gap-6 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)] md:text-2xl">New tree</h2>

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
                  autoComplete="off"
                  required
                  minLength={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Subtitle <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
                </label>
                <Input
                  name="branchbook-tree-subtitle"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Welcome note <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
                </label>
                <textarea
                  name="branchbook-tree-welcome"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClassName} min-h-28`}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Structural moderation
                </label>
                <select
                  name="branchbook-tree-moderation"
                  value={moderationMode}
                  onChange={(event) => setModerationMode(event.target.value)}
                  className={fieldClassName}
                  autoComplete="off"
                >
                  <option value="REVIEW_STRUCTURE">Review structural edits</option>
                  <option value="OPEN">Open collaboration</option>
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-3xl border border-[color:var(--border-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--ink-strong)]">
                <input
                  type="checkbox"
                  checked={generateViewerLink}
                  onChange={(event) => setGenerateViewerLink(event.target.checked)}
                  className="size-4 rounded"
                />
                Viewer link
              </label>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSubmitting} className="gap-2 px-5">
                  <Sprout className="size-4" />
                  {isSubmitting ? "Creating…" : "Create"}
                </Button>
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
              <Link
                href={openTreeHref}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--brand-forest)]"
              >
                Open
                <ArrowRight className="size-4" />
              </Link>
            </Card>
            <ShareLinksCard links={result.links} />
          </>
        ) : null}
      </div>
    </div>
  );
}
