import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "brand" | "success" | "neutral" | "accent" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  brand: "border-indigo-200 bg-indigo-50 text-indigo-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  accent: "border-indigo-300/60 bg-indigo-500/10 text-indigo-200",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-tight",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
