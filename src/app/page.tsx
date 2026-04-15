import { GitBranch, Leaf, ShieldCheck, UserRoundSearch } from "lucide-react";

import { Card } from "@/components/ui/card";
import { CreateTreeForm } from "@/components/tree/create-tree-form";

const highlights = [
  {
    title: "No accounts at all",
    body: "Every role is granted by secure links and browser-local identity tokens instead of signups.",
    icon: UserRoundSearch,
  },
  {
    title: "Moderated collaboration",
    body: "Owner links can approve structural edits, roll back mistakes, and reactivate archived trees.",
    icon: ShieldCheck,
  },
  {
    title: "Artistic plus classic views",
    body: "The same people and relationships render as an organic tree or a readable family diagram.",
    icon: Leaf,
  },
  {
    title: "Full-stack starter included",
    body: "Next.js, Prisma, PostgreSQL, React Flow, Tailwind, token permissions, and seeded demo data are already wired.",
    icon: GitBranch,
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="hero-tree absolute inset-x-0 top-0 h-[720px] opacity-70" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-10 px-4 py-8 md:px-6 md:py-12">
        <CreateTreeForm />

        <section className="grid gap-5 lg:grid-cols-4">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <Card key={highlight.title} className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:rgba(227,182,97,0.18)] text-[var(--brand-forest)]">
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
