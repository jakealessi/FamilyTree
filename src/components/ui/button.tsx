import * as React from "react";

import { cn } from "@/lib/shared/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
};

const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--brand-forest)] text-white shadow-[0_12px_30px_-18px_rgba(42,74,47,0.8)] hover:bg-[#26442d]",
  secondary:
    "bg-[var(--brand-amber)] text-[var(--ink-strong)] hover:bg-[#DCA64A]",
  ghost:
    "bg-transparent text-[var(--ink-soft)] hover:bg-white/60 hover:text-[var(--ink-strong)]",
  outline:
    "border border-[color:var(--border-soft)] bg-white/75 text-[var(--ink-strong)] hover:bg-white",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
