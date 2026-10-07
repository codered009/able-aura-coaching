import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-teal-800 text-white hover:bg-teal-900",
        accent: "bg-terracotta text-white hover:bg-[#a64b1c]",
        outline: "border border-ink/15 bg-white text-ink hover:bg-cream-2",
        ghost: "text-ink hover:bg-cream-2",
        danger: "bg-rose-700 text-white hover:bg-rose-800",
      },
      size: {
        default: "h-11 px-4 text-sm",
        lg: "h-14 px-6 text-base",
        xl: "h-16 px-8 text-lg",
        sm: "h-9 px-3 text-sm",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
