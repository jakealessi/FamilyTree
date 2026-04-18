"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readResponseJson } from "@/lib/client/response-json";

type MeResponse = {
  user: { id: string; email: string; displayName: string | null } | null;
  trees: Array<{ slug: string; title: string }>;
};

const emptyMe: MeResponse = { user: null, trees: [] };

export function AuthForm() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshMe() {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      const json = await readResponseJson<MeResponse>(response);
      setMe(json ?? emptyMe);
    } catch {
      setMe(emptyMe);
    }
  }

  useEffect(() => {
    void refreshMe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, displayName: displayName || null };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await readResponseJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(json?.error ?? "Request failed.");
        return;
      }
      setPassword("");
      await refreshMe();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await refreshMe();
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <Card className="p-5 text-sm text-[var(--ink-muted)]">Loading account…</Card>
    );
  }

  if (me.user) {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:rgba(42,74,47,0.1)] text-[var(--brand-forest)]">
            <CheckCircle2 className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--ink-strong)]">Account ready</p>
            <p className="text-sm text-[var(--ink-soft)]">{me.user.email}</p>
            <p className="text-xs leading-5 text-[var(--ink-muted)]">
              Use this only to keep track of trees you own.
            </p>
          </div>
        </div>
        {me.trees.length > 0 ? (
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-white/80 p-4 text-sm text-[var(--ink-muted)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-[var(--ink-strong)]">Your trees</p>
              <BadgeCount count={me.trees.length} />
            </div>
            <ul className="mt-3 space-y-2">
              {me.trees.map((tree) => (
                <li key={tree.slug}>
                  <Link
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-white/90 px-4 py-3 font-medium text-[var(--ink-strong)] transition hover:border-[color:rgba(42,74,47,0.22)] hover:text-[var(--brand-forest)]"
                    href={`/tree/${tree.slug}`}
                  >
                    <span className="min-w-0 truncate">{tree.title}</span>
                    <ArrowRight className="size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] bg-white/70 p-4 text-sm text-[var(--ink-muted)]">
            No saved trees yet.
          </div>
        )}
        <Button type="button" variant="outline" onClick={() => void handleLogout()} disabled={busy}>
          Sign out
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--ink-strong)]">Optional owner account</p>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          This is only for owners who want a saved list of their own trees.
        </p>
      </div>
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white/72 p-4 text-sm leading-6 text-[var(--ink-soft)]">
        You can skip this. Relatives still do not need accounts to open or help edit a family tree.
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[color:rgba(42,74,47,0.06)] p-1">
        <Button
          type="button"
          variant={mode === "login" ? "secondary" : "ghost"}
          className="w-full text-sm"
          onClick={() => setMode("login")}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "secondary" : "ghost"}
          className="w-full text-sm"
          onClick={() => setMode("register")}
        >
          Create account
        </Button>
      </div>
      <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--ink-strong)]">Email</label>
          <Input
            type="email"
            name="branchbook-account-email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--ink-strong)]">Password</label>
          <Input
            type="password"
            name="branchbook-account-password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
            required
            minLength={mode === "register" ? 8 : 1}
          />
        </div>
        {mode === "register" ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-strong)]">
              Display name <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
            </label>
            <Input
              name="branchbook-account-display"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane"
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <p className="text-xs leading-5 text-[var(--ink-muted)]">
          Family members still do not need accounts. This is only for owners who want a saved list.
        </p>
      </form>
    </Card>
  );
}

function BadgeCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[color:rgba(42,74,47,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-forest)]">
      {count} {count === 1 ? "tree" : "trees"}
    </span>
  );
}

type TreeAccountPanelProps = {
  slug: string;
  linkedToUser: boolean;
  onLinked: () => void;
};

export function TreeAccountPanel({ slug, linkedToUser, onLinked }: TreeAccountPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => readResponseJson<MeResponse>(r))
      .then((json) => setMe(json ?? emptyMe));
  }, []);

  async function handleAttach() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/trees/${slug}/account`, {
        method: "POST",
        credentials: "include",
      });
      const json = await readResponseJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(json?.error ?? "Could not link tree.");
        return;
      }
      onLinked();
    } finally {
      setBusy(false);
    }
  }

  if (linkedToUser) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-[var(--ink-strong)]">
        <CheckCircle2 className="size-4 shrink-0 text-[var(--brand-forest)]" aria-hidden />
        On your account
      </p>
    );
  }

  if (!me?.user) {
    return (
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-forest)]" href="/#account">
        Sign in to link
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[color:var(--border-soft)] bg-white/75 p-4">
      <p className="text-sm text-[var(--ink-strong)]">{me.user.email}</p>
      <p className="text-sm leading-6 text-[var(--ink-muted)]">
        Link this tree to your optional owner account so it shows up in your saved list later.
      </p>
      {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
      <Button type="button" onClick={() => void handleAttach()} disabled={busy}>
        {busy ? "Linking…" : "Save tree to my account"}
      </Button>
    </div>
  );
}
