import type { Evidence } from "@/types/ai";
import type { UserMode } from "@/types/dashboard";

export type TextSegment =
  | { kind: "text"; text: string }
  | { kind: "evidence"; raw: string; evidence: Evidence };

/**
 * Resolve `[B1]` / `[O13a]` / `[PSI-25:B1]` bracketed citations against `message.evidence`.
 * Never invents a link: unmatched brackets stay plain text (src/lib/ai/README.md).
 */
export function parseMessageSegments(content: string, evidence: readonly Evidence[]): TextSegment[] {
  if (!content) return [];

  const byKey = new Map<string, Evidence>();
  for (const item of evidence) {
    byKey.set(item.id.toLowerCase(), item);
    byKey.set(item.label.toLowerCase(), item);
    if (item.kind === "experiment" && item.id.includes(":")) {
      const shortId = item.id.split(":").slice(1).join(":").toLowerCase();
      if (!byKey.has(shortId)) byKey.set(shortId, item);
    }
  }

  const pattern = /\[([A-Za-z0-9:._-]{1,32})\]/g;
  const out: TextSegment[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === "text") {
      prev.text += text;
    } else {
      out.push({ kind: "text", text });
    }
  };
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const token = match[1];
    const resolved = byKey.get(token.toLowerCase()) ?? byKey.get(`psi-25:${token.toLowerCase()}`);

    if (match.index > lastIndex) {
      pushText(content.slice(lastIndex, match.index));
    }
    if (resolved) {
      out.push({ kind: "evidence", raw: match[0], evidence: resolved });
    } else {
      pushText(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    pushText(content.slice(lastIndex));
  }
  return out;
}

/** Suggested prompts tailored to current route and mode (Issue #16). */
export function getSuggestedPrompts(route: string, mode: UserMode): string[] {
  if (route.startsWith("/experiments/")) {
    const id = decodeURIComponent(route.slice("/experiments/".length)).replace(/^PSI-\d+:/, "");
    return mode === "learn"
      ? [
          `What happened during test ${id} in plain language?`,
          `Why was this oxygen level and airflow chosen for ${id}?`,
          `Are there any sensor notes or caveats on ${id}?`,
          `Find a similar run with higher oxygen to compare with ${id}.`,
        ]
      : [
          `Summarize the conditions, QA flags, and inferred fields for ${id}.`,
          `Show me the source PSI files and DOI provenance for ${id}.`,
          `Find two contrasting PMMA runs to compare alongside ${id}.`,
          `Jump the explorer to runs with similar initial O₂ to ${id}.`,
        ];
  }

  if (route.startsWith("/explore")) {
    return mode === "learn"
      ? [
          "Filter to PMMA rods and show me where they sit in the map.",
          "Show runs with oxygen below 18 % and explain what happens.",
          "Which tests are good examples of airflow blowing out a flame?",
          "Reset all filters and show the full BASS-II dataset.",
        ]
      : [
          "Filter to PMMA rods below 18 % O₂ and highlight the O₂ axis.",
          "Which runs carry QA flags and why?",
          "Compare B3 and O13a side by side.",
          "List all PIs and fuel geometries covered in PSI-25.",
        ];
  }

  if (route.startsWith("/compare")) {
    return mode === "learn"
      ? [
          "Explain the main difference between the runs I'm comparing.",
          "Compare a thin PMMA film (B3) against a thick rod (O1).",
          "How does opposed flow differ from concurrent flow in these tests?",
          "Open the What-if Lab with 18 % O₂ and 5 cm/s flow.",
        ]
      : [
          "Compare O1 and P1 — how do ignition side and flow configuration differ?",
          "Summarize the O₂, CO₂, and airflow set-point diffs across my compared runs.",
          "Swap comparison to B3, M5, and O13a.",
          "Which compared runs have QA or sensor caveats?",
        ];
  }

  if (route.startsWith("/lab")) {
    return mode === "learn"
      ? [
          "What happens if I test 16 % O₂ at 3 cm/s on a PMMA rod?",
          "Dial the lab outside the measured envelope and explain why we don't guess.",
          "Compare the closest real match to my current lab sliders.",
          "Open the Learn chapter on oxygen and extinction limits.",
        ]
      : [
          "Set the What-if Lab to 17.5 % O₂, 8 cm/s, PMMA slab 2 mm.",
          "Which real runs lie closest to 21 % O₂ and 2 cm/s on thin film?",
          "What is the measured O₂ and airflow envelope in PSI-25?",
          "Open the top matched run in the Flame Viewer.",
        ];
  }

  if (route.startsWith("/learn")) {
    return [
      "Why do space flames turn blue and spherical in microgravity?",
      "Show me real ISS footage of a low-oxygen flame.",
      "How does nitrogen vitiation in BASS-II test spacecraft fire safety?",
      "Take me to the What-if Lab so I can test airflow conditions.",
    ];
  }

  // Overview `/`
  return mode === "learn"
    ? [
        "What is BASS-II and why did NASA burn plastic on the ISS?",
        "Show me the Explore & Learn view and open a beginner-friendly run.",
        "Filter the Explorer to blue microgravity flames in low oxygen.",
        "Open the What-if Lab at 18 % O₂.",
      ]
    : [
        "Give me a sourced overview of PSI-25 (runs, O₂ range, PIs, QA flags).",
        "Filter the Explorer to PMMA rods with O₂ ≤ 18 %.",
        "Compare B3 and O13a and highlight their differences.",
        "Open run M5 and summarize its CO lower bound and QA notes.",
      ];
}
