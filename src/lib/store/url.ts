/**
 * URL ⇄ store mapping (nuqs parsers). Readable, shareable keys:
 *   ?mode=learn&mat=PMMA&geo=rod&o2=15~18&air=~10&vid=1&sel=PSI-25:B1&cmp=PSI-25:B1,PSI-25:B2
 * Every value read from the URL is validated against the contract before it touches the store.
 */
import {
  createParser,
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs";

import type { ExperimentFilters, Range } from "@/types/dashboard";
import { EMPTY_FILTERS } from "@/types/dashboard";
import { ExperimentFiltersSchema, FlowConfigurationSchema, FuelGeometrySchema, FuelMaterialSchema } from "@/types/schemas";

import type { DashboardData } from "./state";

const parseAsRange = createParser<Range>({
  parse: (value) => {
    const m = /^(-?\d+(?:\.\d+)?)?~(-?\d+(?:\.\d+)?)?$/.exec(value);
    if (!m || (m[1] === undefined && m[2] === undefined)) return null;
    const range: Range = {};
    if (m[1] !== undefined) range.min = Number(m[1]);
    if (m[2] !== undefined) range.max = Number(m[2]);
    return range.min !== undefined && range.max !== undefined && range.min > range.max ? null : range;
  },
  serialize: (r) => `${r.min ?? ""}~${r.max ?? ""}`,
  eq: (a, b) => a.min === b.min && a.max === b.max,
});

const list = parseAsArrayOf(parseAsString, ",");

export const urlParsers = {
  mode: parseAsStringLiteral(["expert", "learn"] as const),
  inv: list,
  pi: list,
  mat: parseAsArrayOf(parseAsStringLiteral(FuelMaterialSchema.options), ","),
  geo: parseAsArrayOf(parseAsStringLiteral(FuelGeometrySchema.options), ","),
  flow: parseAsArrayOf(parseAsStringLiteral(FlowConfigurationSchema.options), ","),
  o2: parseAsRange,
  air: parseAsRange,
  vid: parseAsBoolean,
  qa: parseAsBoolean,
  q: parseAsString,
  sel: list,
  cmp: list,
};

export type UrlState = inferParserType<typeof urlParsers>;

export const serializeUrl = createSerializer(urlParsers);

const emptyRange = (r: Range) => r.min === undefined && r.max === undefined;
const orNull = <T,>(arr: T[]) => (arr.length ? arr : null);

/** Store → URL values (null removes the key, keeping URLs short). */
export function toUrlState(d: DashboardData): UrlState {
  const f = d.filters;
  return {
    mode: d.mode === "expert" ? null : d.mode,
    inv: orNull(f.investigations),
    pi: orNull(f.principalInvestigators),
    mat: orNull(f.materials),
    geo: orNull(f.geometries),
    flow: orNull(f.flowConfigurations),
    o2: emptyRange(f.o2InitialPct) ? null : f.o2InitialPct,
    air: emptyRange(f.airflowCmS) ? null : f.airflowCmS,
    vid: f.hasVideo,
    qa: f.hasQaFlags,
    q: f.text || null,
    sel: orNull(d.selection),
    cmp: orNull(d.compareIds),
  };
}

/** URL values → validated store patch. Invalid pieces are dropped, never half-applied. */
export function fromUrlState(u: Partial<UrlState>): Partial<DashboardData> {
  const candidate: ExperimentFilters = {
    ...EMPTY_FILTERS,
    investigations: u.inv ?? [],
    principalInvestigators: u.pi ?? [],
    materials: u.mat ?? [],
    geometries: u.geo ?? [],
    flowConfigurations: u.flow ?? [],
    o2InitialPct: u.o2 ?? {},
    airflowCmS: u.air ?? {},
    hasVideo: u.vid ?? null,
    hasQaFlags: u.qa ?? null,
    text: (u.q ?? "").slice(0, 200),
  };
  const filters = ExperimentFiltersSchema.safeParse(candidate);
  const ids = (xs: string[] | null | undefined) => (xs ?? []).filter((x) => /^PSI-\d+:.+$/.test(x)).slice(0, 200);
  const cmp = ids(u.cmp).slice(0, 4);
  return {
    mode: u.mode ?? "expert",
    filters: filters.success ? filters.data : EMPTY_FILTERS,
    selection: ids(u.sel),
    compareIds: cmp.length >= 2 ? cmp : [],
  };
}
