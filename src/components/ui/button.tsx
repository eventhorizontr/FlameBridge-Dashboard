import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent-soft" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--bg)] font-medium hover:brightness-110 active:brightness-95 border border-transparent",
  secondary:
    "bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--line-strong)] hover:bg-[var(--surface-3)] hover:border-[var(--accent)]/50",
  ghost:
    "bg-transparent text-[var(--text-2)] border border-transparent hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]",
  "accent-soft":
    "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/60",
  danger:
    "bg-[var(--critical)]/15 text-[var(--critical)] border border-[var(--critical)]/40 hover:bg-[var(--critical)]/25",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-7 px-2.5 py-1 text-[0.8125rem] gap-1.5 rounded-[var(--radius-sm)]",
  md: "min-h-9 px-3.5 py-1.5 text-[0.875rem] gap-2 rounded-[var(--radius-sm)]",
  lg: "min-h-11 px-5 py-2.5 text-[0.9375rem] gap-2 rounded-[var(--radius-md)]",
};

/**
 * Primary instrument button primitive. Minimum 28px interactive height satisfies WCAG 2.2
 * 24px target size, with crisp 2px `--accent` focus-visible rings via globals.css.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading = false, disabled, type = "button", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap select-none cursor-pointer",
        "transition-colors duration-[var(--dur-1)] ease-[var(--ease-out)]",
        "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {children}
    </button>
  );
});
