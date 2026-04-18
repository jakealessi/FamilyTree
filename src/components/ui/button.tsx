import * as React from "react";

import { cn } from "@/lib/shared/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
};

const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border-transparent bg-[var(--brand-forest)] text-white shadow-[0_12px_24px_rgba(42,74,47,0.16)] hover:-translate-y-[1px] hover:bg-[#244129]",
  secondary:
    "border-transparent bg-[var(--brand-amber)] text-[var(--ink-strong)] shadow-[0_10px_22px_rgba(227,182,97,0.18)] hover:-translate-y-[1px] hover:bg-[#DCA64A]",
  ghost:
    "border-transparent bg-transparent text-[var(--ink-soft)] hover:bg-[color:rgba(42,74,47,0.06)] hover:text-[var(--ink-strong)]",
  outline:
    "border-[color:rgba(88,67,44,0.14)] bg-[color:var(--surface-soft)] text-[var(--ink-strong)] shadow-[0_1px_0_rgba(255,255,255,0.6)] hover:-translate-y-[1px] hover:border-[color:rgba(42,74,47,0.24)] hover:bg-white",
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
        "inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:#f3eee5] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
