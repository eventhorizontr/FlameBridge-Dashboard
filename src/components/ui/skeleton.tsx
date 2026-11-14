import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)] animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
