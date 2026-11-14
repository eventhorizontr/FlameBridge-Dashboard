/**
 * Dataset validation: schema conformance (schemas.ts) + cross-record invariants that a
 * per-field schema cannot express. Used by loaders, the pipeline CI test and the AI tools.
 */
import type { z } from "zod";

import type { ExperimentDataset, InvestigationManifest } from "./experiment";
import { ExperimentDatasetSchema, InvestigationManifestSchema } from "./schemas";

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const MAX_ERRORS = 50;

function formatIssues(issues: readonly z.core.$ZodIssue[]): string[] {
  const lines = issues.slice(0, MAX_ERRORS).map((issue) => {
    const path = issue.path.length ? issue.path.map(String).join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
  if (issues.length > MAX_ERRORS) lines.push(`… and ${issues.length - MAX_ERRORS} more`);
  return lines;
}

function datasetInvariants(d: ExperimentDataset): string[] {
  const errors: string[] = [];
  if (d.count !== d.experiments.length) {
    errors.push(`count: declared ${d.count} but ${d.experiments.length} experiments present`);
  }
  const seen = new Set<string>();
  d.experiments.forEach((e, i) => {
    if (seen.has(e.id)) errors.push(`experiments.${i}.id: duplicate id ${e.id}`);
    seen.add(e.id);
    if (e.id !== `${d.accession}:${e.testId}`) {
      errors.push(`experiments.${i}.id: ${e.id} ≠ ${d.accession}:${e.testId}`);
    }
    if (e.investigation !== d.accession) {
      errors.push(`experiments.${i}.investigation: ${e.investigation} ≠ dataset ${d.accession}`);
    }
    const c = e.conditions;
    for (const key of ["o2InitialPct", "o2FinalPct", "co2InitialPct", "co2FinalPct"] as const) {
      const v = c[key];
      if (v !== null && (v < 0 || v > 100)) {
        errors.push(`experiments.${i}.conditions.${key}: ${v} is not a volume percentage`);
      }
    }
    for (const v of e.videos) {
      if (v.href !== `/api/psi/file/${d.accession}/${v.id}`) {
        errors.push(`experiments.${i}.videos.${v.id}: href does not resolve to its own file id`);
      }
    }
  });
  return errors.slice(0, MAX_ERRORS);
}

/** Validate an `experiments.json` payload. Never throws. */
export function validateDataset(json: unknown): ValidationResult<ExperimentDataset> {
  const parsed = ExperimentDatasetSchema.safeParse(json);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error.issues) };
  const errors = datasetInvariants(parsed.data);
  return errors.length ? { ok: false, errors } : { ok: true, data: parsed.data };
}

/** Validate a `manifest.json` payload. Never throws. */
export function validateManifest(json: unknown): ValidationResult<InvestigationManifest> {
  const parsed = InvestigationManifestSchema.safeParse(json);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error.issues) };
  const m = parsed.data;
  const files = Object.values(m.groups).reduce((n, g) => n + g.length, 0);
  if (files !== m.totals.files) {
    return { ok: false, errors: [`totals.files: declared ${m.totals.files} but ${files} listed`] };
  }
  return { ok: true, data: m };
}
