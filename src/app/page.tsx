import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { CreateTreeForm } from "@/components/tree/create-tree-form";
import { ArrowRight, Link2, Lock, Users } from "lucide-react";

const launchSteps = [
  {
    title: "Make the tree",
    description: "Start with a title and one first relative. You can keep the rest blank for now.",
    icon: Link2,
  },
  {
    title: "Send the right link",
    description: "Give relatives edit, view-only, or personal links without making anyone sign up.",
    icon: Users,
  },
  {
    title: "Keep it private",
    description: "The tree stays private by default, and the owner keeps a recovery link for full control.",
    icon: Lock,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-4 py-8 md:px-6 md:py-12">
        <header className="relative overflow-hidden rounded-[2.25rem] border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.8)] px-6 py-8 shadow-[0_28px_70px_rgba(47,36,28,0.08)] md:px-10 md:py-12">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[color:rgba(227,182,97,0.14)] blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[color:rgba(42,74,47,0.12)] blur-3xl" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:items-start">
            <div className="max-w-4xl space-y-6">
              <Badge className="bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                Private family trees
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)] md:text-6xl">
                  Build a family tree together without making anyone create an account.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)] md:text-lg">
                  Start one shared tree, send the link to relatives, and let everyone add names,
                  photos, and memories at their own pace.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--ink-soft)]">
                  No signups or passwords for relatives
                </div>
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--ink-soft)]">
                  Private owner, contributor, and viewer links
                </div>
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--ink-soft)]">
                  Clear enough for phones, tablets, and desktops
                </div>
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--ink-soft)]">
                  Add only the basics now and fill in more later
                </div>
              </div>
            </div>

            <Card className="space-y-4 bg-[color:rgba(255,255,255,0.76)] p-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                  How It Works
                </p>
                <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
                  Three simple steps
                </h2>
              </div>
              <div className="space-y-3">
                {launchSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-[color:var(--border-soft)] bg-white/75 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[color:rgba(42,74,47,0.08)] text-[var(--brand-forest)]">
                          <Icon className="size-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                            Step {index + 1}
                          </p>
                          <p className="font-semibold text-[var(--ink-strong)]">{step.title}</p>
                          <p className="text-sm leading-6 text-[var(--ink-muted)]">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a
                href="#create-tree"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-forest)]"
              >
                Start with a new tree
                <ArrowRight className="size-4" />
              </a>
            </Card>
          </div>
        </header>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div id="create-tree" className="space-y-4 scroll-mt-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                Start here
              </p>
              <h2 className="text-2xl font-semibold text-[var(--ink-strong)] md:text-3xl">
                Create the first branch
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
                Make the tree, copy the right links, and invite family members to fill things in
                together.
              </p>
            </div>
            <CreateTreeForm />
          </div>

          <div id="account" className="scroll-mt-8 space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card className="space-y-3 bg-[color:var(--surface-muted)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                Only If You Want It
              </p>
              <h2 className="text-2xl font-semibold text-[var(--ink-strong)]">
                Save your owner trees in one place
              </h2>
              <p className="text-sm leading-7 text-[var(--ink-muted)]">
                Most families can ignore this completely. It is only for owners who want a private
                place to keep track of trees they own across devices.
              </p>
            </Card>
            <AuthForm />
          </div>
        </section>
      </div>
    </main>
  );
}
