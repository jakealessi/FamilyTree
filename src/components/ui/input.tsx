import * as React from "react";

import { cn } from "@/lib/shared/utils";

export const fieldClassName =
  "min-h-12 w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:rgba(255,255,255,0.86)] px-4 py-3 text-sm text-[var(--ink-strong)] shadow-[0_1px_0_rgba(255,255,255,0.68),inset_0_1px_2px_rgba(47,36,28,0.03)] outline-none transition placeholder:text-[var(--ink-muted)] placeholder:opacity-70 focus:border-[color:var(--brand-forest)] focus:bg-white focus:ring-2 focus:ring-[color:rgba(42,74,47,0.12)]";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClassName, className)} {...props} />;
}
