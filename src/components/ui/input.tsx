import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-base text-ink shadow-sm placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("text-sm font-semibold text-ink/80", className)} {...props} />
  );
}
