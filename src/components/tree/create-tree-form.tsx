"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Leaf, Sprout } from "lucide-react";

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
      <Card className="overflow-hidden p-0">
        <div className="relative">
          <div className="relative grid gap-8 p-6 md:p-8">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[color:var(--border-soft)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                <Leaf className="size-4 text-[var(--brand-forest)]" />
                Start a tree
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-4xl">
                  Create a private family tree
                </h2>
                <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
                  This browser will be remembered as the owner. You can sign in later to save the tree to your account and open it on other devices.
                </p>
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
                Generate a read-only viewer link
              </label>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSubmitting} className="gap-2 px-5">
                  <Sprout className="size-4" />
                  {isSubmitting ? "Creating tree..." : "Create family tree"}
                </Button>
                {result ? (
                  <Link
                    href={openTreeHref}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--brand-forest)]"
                  >
                    Open your tree
                    <ArrowRight className="size-4" />
                  </Link>
                ) : null}
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
            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Tree created</h3>
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    Open it on this browser to manage it as owner. Use the editor link when you invite relatives to help.
                  </p>
                </div>
              </div>
              <Link
                href={openTreeHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-forest)]"
              >
                Open your tree
                <ArrowRight className="size-4" />
              </Link>
            </Card>
            <ShareLinksCard links={result.links} />
          </>
        ) : (
          <Card className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                How access works
              </p>
              <h2 className="text-2xl font-semibold text-[var(--ink-strong)]">
                Your browser is the owner key
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              <p>No separate “owner link” to manage. The device you use to create the tree is trusted until you sign in and attach the tree to an account.</p>
              <p>Editors use one share link and enter their name once so changes show clearly in history.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
