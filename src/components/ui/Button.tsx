import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "success" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.55)] hover:from-indigo-500 hover:to-indigo-700 active:translate-y-[1px] focus-visible:outline-indigo-500",
  secondary:
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/60 active:translate-y-[1px] focus-visible:outline-indigo-400",
  success:
    "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] hover:from-emerald-500 hover:to-emerald-700 active:translate-y-[1px] focus-visible:outline-emerald-500",
  ghost:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-slate-400",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export function Button({
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight transition will-change-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
