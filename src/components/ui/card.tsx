import * as React from "react";

import { cn } from "@/lib/shared/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-strong)] p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
