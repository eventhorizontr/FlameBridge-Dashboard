import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export function Kbd({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "num inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-[4px]",
        "bg-[var(--surface-3)] border border-[var(--line-strong)] text-[0.6875rem] font-medium text-[var(--text-2)] leading-none",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
