import { AuthForm } from "@/components/auth-form";
import { CreateTreeForm } from "@/components/tree/create-tree-form";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 py-10 md:px-6 md:py-14">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink-strong)] md:text-4xl">
            Branchbook
          </h1>
        </header>

        <section>
          <CreateTreeForm />
        </section>

        <section id="account" className="scroll-mt-8 max-w-md">
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
