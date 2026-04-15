import * as React from "react";

import { cn } from "@/lib/shared/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[color:rgba(255,255,255,0.72)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]",
        className,
      )}
      {...props}
    />
  );
}
