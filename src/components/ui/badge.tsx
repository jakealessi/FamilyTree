import * as React from "react";

import { cn } from "@/lib/shared/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color:rgba(88,67,44,0.08)] bg-[color:rgba(255,255,255,0.72)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]",
        className,
      )}
      {...props}
    />
  );
}
