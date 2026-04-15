"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sprout, Trees } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { ShareLinksCard } from "@/components/tree/share-links-card";

type CreateResponse = {
  tree: {
    slug: string;
    title: string;
  };
  links: {
    stable: string;
    owner: string;
    contributor: string;
    viewer: string | null;
  };
};

export function CreateTreeForm() {
  const [title, setTitle] = useState("Hawthorne Family");
  const [subtitle, setSubtitle] = useState("Our living, shared family story");
  const [description, setDescription] = useState(
    "Invite relatives with secure links so everyone can add profiles, photos, and memories without creating accounts.",
  );
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
      const response = await fetch("/api/trees", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title,
          subtitle,
          description,
          moderationMode,
          generateViewerLink,
        }),
      });

      const json = (await response.json()) as CreateResponse & { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Could not create the tree.");
        return;
      }

      setResult(json);
    } catch {
      setError("The tree could not be created right now. Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <Card className="overflow-hidden p-0">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(228,192,130,0.38),_transparent_68%)]" />
          <div className="relative grid gap-10 p-6 md:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(255,255,255,0.72)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                <Trees className="size-4 text-[var(--brand-forest)]" />
                Build the tree in minutes
              </div>
              <div className="max-w-2xl space-y-3">
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-6xl">
                  Private family trees that relatives can grow together without
                  accounts.
                </h1>
                <p className="max-w-xl text-base leading-8 text-[var(--ink-soft)] md:text-lg">
                  Create a tree once, keep the same permanent family URL, and share
                  owner, contributor, or viewer links that feel simple enough for every
                  generation.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Tree title
                </label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Subtitle
                </label>
                <Input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Welcome note
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClassName} min-h-28`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Structural moderation
                </label>
                <select
                  value={moderationMode}
                  onChange={(event) => setModerationMode(event.target.value)}
                  className={fieldClassName}
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
                    href={result.links.owner}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--brand-forest)]"
                  >
                    Open the owner workspace
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
          <ShareLinksCard
            links={{
              owner: result.links.owner,
              contributor: result.links.contributor,
              viewer: result.links.viewer,
            }}
          />
        ) : (
          <Card className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                What ships in this starter
              </p>
              <h2 className="text-2xl font-semibold text-[var(--ink-strong)]">
                The whole no-account collaboration model is already wired.
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              <p>Permanent tree URLs plus owner, contributor, viewer, and personal claim links.</p>
              <p>Anonymous browser identities, profile claims, recovery codes, and personal edit links.</p>
              <p>React Flow powered artistic and classic diagram modes with moderation and rollback.</p>
              <p>Prisma models, seed data, Tailwind styling, responsive panels, and media upload support.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
