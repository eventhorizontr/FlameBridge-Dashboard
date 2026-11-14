import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

export type IconButtonVariant = "ghost" | "secondary" | "accent-soft";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Mandatory accessible name because the control only displays an icon. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  badgeCount?: number;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-[var(--text-2)] border border-transparent hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]",
  secondary:
    "bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--line)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)] hover:border-[var(--line-strong)]",
  "accent-soft":
    "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/35 hover:bg-[var(--accent)]/20",
};

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "size-7 rounded-[var(--radius-sm)]",
  md: "size-9 rounded-[var(--radius-sm)]",
  lg: "size-10 rounded-[var(--radius-md)]",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "secondary", size = "md", active = false, badgeCount, className, type = "button", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={props.title ?? label}
      aria-pressed={active ? true : undefined}
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 cursor-pointer",
        "transition-colors duration-[var(--dur-1)] ease-[var(--ease-out)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        active && "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40",
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span
          aria-hidden="true"
          className="num absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-[0.625rem] font-semibold leading-4 text-center"
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </button>
  );
});
