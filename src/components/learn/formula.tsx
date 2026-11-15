import { cn } from "@/components/ui";

export type FormulaToken = { kind: "text" | "sub" | "sup"; value: string };

/** Parses the curriculum mini-syntax: `_{sub}` and `^{sup}`; everything else is text. */
export function formulaTokens(source: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  const pattern = /([_^])\{([^}]*)\}/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) tokens.push({ kind: "text", value: source.slice(last, at) });
    tokens.push({ kind: match[1] === "_" ? "sub" : "sup", value: match[2] });
    last = at + match[0].length;
  }
  if (last < source.length) tokens.push({ kind: "text", value: source.slice(last) });
  return tokens;
}

export function Formula({ source, className }: { source: string; className?: string }) {
  return (
    <span className={cn("font-serif italic whitespace-pre-wrap", className)}>
      {formulaTokens(source).map((t, i) =>
        t.kind === "sub" ? (
          <sub key={i} className="text-[0.7em]">
            {t.value}
          </sub>
        ) : t.kind === "sup" ? (
          <sup key={i} className="text-[0.7em]">
            {t.value}
          </sup>
        ) : (
          <span key={i}>{t.value}</span>
        ),
      )}
    </span>
  );
}
