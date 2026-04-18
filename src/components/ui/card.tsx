import * as React from "react";

import { cn } from "@/lib/shared/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[color:rgba(88,67,44,0.1)] bg-[color:var(--surface)] p-6 shadow-[0_18px_44px_rgba(47,36,28,0.06)] backdrop-blur-[6px]",
        className,
      )}
      {...props}
    />
  );
}
