import {
  ArrowRight,
  GitBranch,
  Leaf,
  Link2,
  ShieldCheck,
  Sprout,
  UserRoundSearch,
} from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";
import { CreateTreeForm } from "@/components/tree/create-tree-form";

const highlights = [
  {
    title: "Browser remembers you",
    body: "The device that creates a tree is treated as owner—no separate owner URL to juggle. Optional accounts save trees across devices.",
    icon: UserRoundSearch,
  },
  {
    title: "Moderated collaboration",
    body: "Owners can approve structural edits, roll back mistakes, and reactivate archived trees.",
    icon: ShieldCheck,
  },
  {
    title: "Bracket-style tree",
    body: "Generations read top to bottom so it is easy to scan and add people without a decorative canvas.",
    icon: Leaf,
  },
  {
    title: "Full-stack starter included",
    body: "Next.js, Prisma, PostgreSQL, Tailwind, token permissions, and seeded demo data are already wired.",
    icon: GitBranch,
  },
];

const steps = [
  {
    title: "Create a private tree",
    body: "Pick a title. This browser is remembered as the owner; sign in later if you want the tree on every device.",
    icon: Sprout,
  },
  {
    title: "Share one edit link",
    body: "Relatives use the same collaborator link. They enter their name once so edits are easy to recognize.",
    icon: Link2,
  },
  {
    title: "Grow it together",
    body: "Add people from the bracket view, connect relationships, and keep the shared record current.",
    icon: ArrowRight,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-8 md:px-6 md:py-12">
        <header className="flex flex-col gap-4 rounded-lg border border-[color:var(--border-soft)] bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Branchbook
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Simple family trees—browser owner by default, optional account to sync.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:rgba(42,74,47,0.08)] px-4 py-2 text-sm font-medium text-[var(--brand-forest)]">
            <ShieldCheck className="size-4" />
            Private by default
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
          <div className="space-y-6 pt-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-soft)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <Leaf className="size-4 text-[var(--brand-forest)]" />
              Permanent family URLs
            </div>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)] md:text-6xl">
                A calmer, clearer way for families to build one shared tree.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)] md:text-lg">
                Branchbook keeps collaboration simple: create a tree once, share secure links,
                and let relatives add people, photos, and history without ever making an account.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title} className="space-y-4 p-5">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                        {step.title}
                      </h2>
                      <p className="text-sm leading-7 text-[var(--ink-soft)]">{step.body}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <CreateTreeForm />
        </section>

        <section id="account" className="scroll-mt-8">
          <AuthForm />
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <Card key={highlight.title} className="space-y-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {highlight.title}
                  </h2>
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">{highlight.body}</p>
                </div>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
