import * as React from "react";

import { cn } from "@/lib/shared/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
};

const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-[var(--brand-forest)] text-white hover:bg-[#26442d]",
  secondary: "bg-[var(--brand-amber)] text-[var(--ink-strong)] hover:bg-[#DCA64A]",
  ghost:
    "bg-transparent text-[var(--ink-soft)] hover:bg-[color:rgba(0,0,0,0.04)] hover:text-[var(--ink-strong)]",
  outline:
    "border border-[color:var(--border-soft)] bg-white text-[var(--ink-strong)] hover:bg-[color:rgba(0,0,0,0.03)]",
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
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
