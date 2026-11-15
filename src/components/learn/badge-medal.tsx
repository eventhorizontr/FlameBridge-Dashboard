import { Flame, Lock } from "lucide-react";

import { cn } from "@/components/ui";

/** Badge medallion. `ignite` plays the one-shot "catches fire" animation (off under reduced motion). */
export function BadgeMedal({
  earned,
  ignite = false,
  code,
  size = "md",
}: {
  earned: boolean;
  ignite?: boolean;
  code: string;
  size?: "md" | "lg";
}) {
  const dims = size === "lg" ? "size-20" : "size-14";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-2",
        dims,
        earned
          ? "border-[var(--flame-edge)] bg-[radial-gradient(circle_at_50%_70%,var(--ember)_0%,var(--ember-soft)_65%,transparent_100%)] text-[var(--text-1)] shadow-[0_0_24px_var(--ember-glow)]"
          : "border-dashed border-[var(--line-strong)] bg-[var(--surface-1)] text-[var(--text-3)]",
        ignite && earned && "learn-ignite",
      )}
    >
      {earned ? (
        <Flame className={size === "lg" ? "size-9" : "size-6"} strokeWidth={1.75} />
      ) : (
        <Lock className="size-5" />
      )}
      <span
        className={cn(
          "absolute -bottom-1.5 rounded-full border px-1.5 text-[0.625rem] font-mono leading-4",
          earned ? "border-[var(--flame-edge)] bg-[var(--bg)] text-[var(--flame-edge)]" : "border-[var(--line)] bg-[var(--bg)] text-[var(--text-3)]",
        )}
      >
        {code}
      </span>
    </span>
  );
}
