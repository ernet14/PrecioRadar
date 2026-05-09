import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto box-border w-full max-w-6xl px-5 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
