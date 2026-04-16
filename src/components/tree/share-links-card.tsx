"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Users, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { copyTextToClipboard } from "@/lib/client/clipboard";

type ShareLinks = {
  stable: string;
  edit: string;
  viewer: string | null;
};

export function ShareLinksCard({ links }: { links: ShareLinks }) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const resetCopyTimeoutRef = useRef<number | null>(null);
  const items = [
    {
      label: "Tree address",
      description: "Bookmark this page on your device. On the device that created the tree, you are the owner automatically.",
      value: links.stable,
      icon: Link2,
    },
    {
      label: "Invite editors",
      description: "Anyone with this link can help add people and relationships. They will be asked for their name for the activity log.",
      value: links.edit,
      icon: Users,
    },
    links.viewer
      ? {
          label: "View only",
          description: "Read-only browsing for relatives who should not change the tree.",
          value: links.viewer,
          icon: Eye,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
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

    setCopyError("Copying was blocked on this device. You can still select a link and copy it manually.");
  }

  return (
    <Card className="space-y-5">
      {copiedLabel ? (
        <p className="sr-only" aria-live="polite">
          {copiedLabel} copied to clipboard
        </p>
      ) : null}
      <div>
        <h3 className="text-base font-semibold text-[var(--ink-strong)]">Sharing</h3>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Copy links to invite or bookmark.</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`rounded-lg border bg-white p-4 transition-colors ${
                copiedLabel === item.label
                  ? "border-[color:var(--brand-forest)] bg-[color:var(--state-info-bg)]"
                  : "border-[color:var(--border-soft)]"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-4 text-[var(--brand-forest)]" aria-hidden />
                <p className="font-medium text-[var(--ink-strong)]">{item.label}</p>
              </div>
              <p className="mb-3 text-xs text-[var(--ink-muted)]">{item.description}</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={item.value}
                  aria-label={`${item.label} URL`}
                  className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:rgba(0,0,0,0.02)] px-3 py-2 text-xs text-[var(--ink-soft)]"
                />
                <Button
                  variant="outline"
                  onClick={() => void handleCopy(item.label, item.value)}
                  className={
                    copiedLabel === item.label
                      ? "border-[color:var(--brand-forest)] text-[var(--brand-forest)]"
                      : undefined
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
