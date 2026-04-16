"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

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
      <Card className="p-4 text-sm text-[var(--ink-muted)]">Loading account…</Card>
    );
  }

  if (me.user) {
    return (
      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-[var(--ink-strong)]">Signed in</p>
        <p className="text-sm text-[var(--ink-soft)]">{me.user.email}</p>
        {me.trees.length > 0 ? (
          <div className="text-sm text-[var(--ink-muted)]">
            <p className="font-medium text-[var(--ink-strong)]">Your trees</p>
            <ul className="mt-2 space-y-1">
              {me.trees.map((tree) => (
                <li key={tree.slug}>
                  <Link className="text-[var(--brand-forest)] underline" href={`/tree/${tree.slug}`}>
                    {tree.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">No trees</p>
        )}
        <Button type="button" variant="outline" onClick={() => void handleLogout()} disabled={busy}>
          Sign out
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-semibold text-[var(--ink-strong)]">Account</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "login" ? "secondary" : "outline"}
          className="text-sm"
          onClick={() => setMode("login")}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "secondary" : "outline"}
          className="text-sm"
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
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </Card>
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
      <Link className="text-sm font-semibold text-[var(--brand-forest)]" href="/#account">
        Sign in to link
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--ink-strong)]">{me.user.email}</p>
      {error ? <p className="text-sm text-[#9A4136]">{error}</p> : null}
      <Button type="button" onClick={() => void handleAttach()} disabled={busy}>
        {busy ? "Linking…" : "Save tree to my account"}
      </Button>
    </div>
  );
}
