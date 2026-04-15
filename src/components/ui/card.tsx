import * as React from "react";

import { cn } from "@/lib/shared/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[color:var(--border-soft)] bg-white/80 p-5 shadow-[0_30px_80px_-50px_rgba(63,53,38,0.45)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
