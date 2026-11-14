"use client";

import { useEffect, useState } from "react";

import { useDashboard } from "@/lib/store";

/**
 * Subscribe to the store's `highlight` signal and emit a timed visual pulse whenever an AI
 * action highlights `target`. Elements should always carry `data-highlight="<target>"`.
 */
export function useHighlightPulse(target?: string) {
  const highlight = useDashboard((s) => s.highlight);
  const [pulsingSeq, setPulsingSeq] = useState<number | null>(null);

  const active = Boolean(target && highlight && highlight.target === target);

  useEffect(() => {
    if (!active || !highlight) return;
    const seq = highlight.seq;
    const showTimer = window.setTimeout(() => setPulsingSeq(seq), 0);
    const hideTimer = window.setTimeout(() => {
      setPulsingSeq((prev) => (prev === seq ? null : prev));
    }, 1800);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [active, highlight]);

  const isHighlighted = Boolean(active && highlight && pulsingSeq === highlight.seq);

  return {
    isHighlighted,
    highlightProps: target
      ? {
          "data-highlight": target,
          "data-highlighted": isHighlighted ? "true" : undefined,
        }
      : {},
    highlightClassName: isHighlighted
      ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)] shadow-[0_0_0_6px_var(--accent-soft)] transition-shadow duration-300"
      : undefined,
  };
}
