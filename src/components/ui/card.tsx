import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-ink/10 bg-white p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "teal",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "teal" | "terracotta" | "amber" | "rose" | "slate" | "green";
}) {
  const tones = {
    teal: "bg-teal-800/10 text-teal-900",
    terracotta: "bg-orange-100 text-terracotta",
    amber: "bg-amber-100 text-amber-900",
    rose: "bg-rose-100 text-rose-800",
    slate: "bg-stone-100 text-stone-700",
    green: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
