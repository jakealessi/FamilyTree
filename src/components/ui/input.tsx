import * as React from "react";

import { cn } from "@/lib/shared/utils";

export const fieldClassName =
  "w-full rounded-2xl border border-[color:var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[color:var(--brand-amber)] focus:bg-white focus:ring-2 focus:ring-[color:rgba(227,182,97,0.25)]";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClassName, className)} {...props} />;
}
