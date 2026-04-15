import * as React from "react";

import { cn } from "@/lib/shared/utils";

import { fieldClassName } from "./input";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClassName, "min-h-28 resize-y", className)} {...props} />;
}
