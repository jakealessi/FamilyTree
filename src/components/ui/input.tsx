import * as React from "react";

import { cn } from "@/lib/shared/utils";

export const fieldClassName =
  "w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition placeholder:text-[var(--ink-muted)] placeholder:opacity-55 focus:border-[color:var(--brand-forest)] focus:ring-2 focus:ring-[color:rgba(42,74,47,0.15)]";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClassName, className)} {...props} />;
}
