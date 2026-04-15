"use client";

import { Link2, Shield, Users, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ShareLinks = {
  owner: string;
  contributor: string;
  viewer: string | null;
};

export function ShareLinksCard({ links }: { links: ShareLinks }) {
  const items = [
    {
      label: "Owner",
      description: "Full control, moderation, rollback, and reactivation.",
      value: links.owner,
      icon: Shield,
    },
    {
      label: "Contributor",
      description: "Family members can add people, claim profiles, and suggest structure.",
      value: links.contributor,
      icon: Users,
    },
    links.viewer
      ? {
          label: "Viewer",
          description: "Read-only access for relatives who just want to browse.",
          value: links.viewer,
          icon: Eye,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    description: string;
    value: string;
    icon: typeof Shield;
  }>;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[color:rgba(227,182,97,0.18)] text-[var(--brand-forest)]">
          <Link2 className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Share links</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Copy and send only the access level each relative needs.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-3xl border border-[color:var(--border-soft)] bg-white/70 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-4 text-[var(--brand-forest)]" />
                <p className="font-semibold text-[var(--ink-strong)]">{item.label}</p>
              </div>
              <p className="mb-3 text-sm text-[var(--ink-muted)]">{item.description}</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={item.value}
                  className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.74)] px-3 py-2 text-xs text-[var(--ink-soft)]"
                />
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(item.value)}
                >
                  Copy
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
