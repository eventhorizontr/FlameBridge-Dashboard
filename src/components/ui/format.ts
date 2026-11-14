import type { UserMode } from "@/types/dashboard";

/**
 * Format a scientific measurement for display. Missing (`null` / `undefined`) never becomes 0;
 * it always emits `"—"` paired with an explicit reason for honesty.
 */
export function formatMetricValue(
  value: number | string | null | undefined,
  options: { unit?: string; mode?: UserMode; precision?: number } = {},
): { text: string; missing: boolean } {
  if (value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value))) {
    return { text: "—", missing: true };
  }
  const formatted =
    typeof value === "number"
      ? options.precision !== undefined
        ? value.toFixed(options.precision)
        : Number.isInteger(value)
          ? String(value)
          : String(Number(value.toPrecision(4)))
      : value;

  if (!options.unit) return { text: formatted, missing: false };
  const sep = options.mode === "learn" ? " " : "\u2009";
  return { text: `${formatted}${sep}${options.unit}`, missing: false };
}

export function formatNullWithReason(nullReason?: string): string {
  return nullReason?.trim() || "Not measured / unparseable in source";
}

export function summarizeQaFlags(flags: readonly string[], parse?: string) {
  return {
    count: flags.length,
    isClean: flags.length === 0,
    label: flags.length === 0 ? "QA verified" : `QA · ${flags.length}`,
    parseLabel: parse ? `parse: ${parse}` : "parse: unspecified",
    flags: [...flags],
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes}\u2009B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)}\u2009${units[idx]}`;
}
