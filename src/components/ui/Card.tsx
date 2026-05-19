import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]",
        interactive &&
          "transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-12px_rgba(79,70,229,0.18)]",
        className,
      )}
      {...props}
    />
  );
}
