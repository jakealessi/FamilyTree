"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Users, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { copyTextToClipboard } from "@/lib/client/clipboard";

type ShareLinks = {
  owner?: string | null;
  stable: string;
  edit: string;
  viewer: string | null;
};

export function ShareLinksCard({ links }: { links: ShareLinks }) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const resetCopyTimeoutRef = useRef<number | null>(null);
  const items = [
    links.owner
      ? {
          label: "Owner link",
          badge: "Keep private",
          description:
            "Full-control recovery link for the tree owner. Save this somewhere safe and do not share it broadly.",
          value: links.owner,
          icon: Link2,
        }
      : null,
    {
      label: "This page",
      badge: "Stable",
      description: "Stable link for anyone who already has access to this tree.",
      value: links.stable,
      icon: Link2,
    },
    {
      label: "Edit link",
      badge: "Best for helpers",
      description: "Send this to relatives who should be allowed to add and edit people.",
      value: links.edit,
      icon: Users,
    },
    links.viewer
      ? {
          label: "View only",
          badge: "Read only",
          description: "Read-only access for relatives who should not make changes.",
          value: links.viewer,
          icon: Eye,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    badge: string;
    description: string;
    value: string;
    icon: typeof Link2;
  }>;

  useEffect(() => {
    return () => {
      if (resetCopyTimeoutRef.current) {
        window.clearTimeout(resetCopyTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy(label: string, value: string) {
    const didCopy = await copyTextToClipboard(value);
    if (didCopy) {
      setCopiedLabel(label);
      setCopyError(null);
      if (resetCopyTimeoutRef.current) {
        window.clearTimeout(resetCopyTimeoutRef.current);
      }
      resetCopyTimeoutRef.current = window.setTimeout(() => {
        setCopiedLabel((current) => (current === label ? null : current));
      }, 1500);
      return;
    }

    setCopyError("Select the field and copy manually.");
  }

  return (
    <Card className="space-y-5">
      {copiedLabel ? (
        <p className="sr-only" aria-live="polite">
          {copiedLabel} copied to clipboard
        </p>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--ink-strong)]">Links</h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Copy the right link for each relative so access stays simple and private. Keep the owner
          link for yourself.
        </p>
      </div>
      <div className="rounded-2xl border border-[color:rgba(227,182,97,0.45)] bg-[color:rgba(255,248,234,0.8)] p-4 text-sm text-[var(--ink-strong)]">
        Send the edit or view link to relatives. Keep the owner link private so you always have
        full control.
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`rounded-2xl border bg-white p-4 transition-colors ${
                copiedLabel === item.label
                  ? "border-[color:var(--brand-forest)] bg-[color:var(--state-info-bg)]"
                  : "border-[color:var(--border-soft)]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-[var(--brand-forest)]" aria-hidden />
                  <p className="font-medium text-[var(--ink-strong)]">{item.label}</p>
                </div>
                <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                  {item.badge}
                </Badge>
              </div>
              <p className="mb-3 text-sm leading-6 text-[var(--ink-muted)]">
                {item.description}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={item.value}
                  aria-label={`${item.label} URL`}
                  className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.02)] px-3 py-2.5 font-mono text-[11px] text-[var(--ink-soft)]"
                />
                <Button
                  variant="outline"
                  onClick={() => void handleCopy(item.label, item.value)}
                  className={
                    copiedLabel === item.label
                      ? "sm:min-w-28 border-[color:var(--brand-forest)] text-[var(--brand-forest)]"
                      : "sm:min-w-28"
                  }
                >
                  {copiedLabel === item.label ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="size-4" />
                      Copied
                    </span>
                  ) : (
                    "Copy"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {copyError ? <p className="text-xs leading-6 text-[var(--ink-soft)]">{copyError}</p> : null}
    </Card>
  );
}
