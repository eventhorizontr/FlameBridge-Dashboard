/**
 * Server-side numbers and picks for the landing page. Everything is computed from the published
 * data (experiments.json, manifest.json, vision/index.json); nothing is typed in by hand.
 */
import type { LibraryEntry } from "@/components/vision/flame-library";
import { computeOverviewStats, fuelFamily, representativeAirflow, type FuelFamily } from "@/components/viz/dataset-queries";
import type { ExperimentDataset, InvestigationManifest } from "@/types/experiment";

import { flameLibraryEntries } from "./library";

export interface LandingBurn extends LibraryEntry {
  /** Why this burn was picked, from a computed statistic. */
  pick: string;
  family: FuelFamily;
}

export interface LandingPoint {
  id: string;
  testId: string;
  o2: number;
  air: number;
  family: FuelFamily;
}

export interface LandingData {
  runs: number;
  teams: number;
  years: string;
  o2Range: [number, number] | null;
  airflowRange: [number, number] | null;
  videos: number;
  videoGb: number;
  measured: number;
  hero: LandingBurn[];
  six: LandingBurn[];
  points: LandingPoint[];
  unplotted: number;
}

export function landingData(dataset: ExperimentDataset, manifest: InvestigationManifest): LandingData {
  const stats = computeOverviewStats(dataset, manifest);
  const byId = new Map(dataset.experiments.map((e) => [e.id, e]));
  const library = flameLibraryEntries(dataset).filter((e) => e.poster);
  const fam = (e: LibraryEntry) => fuelFamily(byId.get(e.experimentId)!.fuel);
  const withFam = (e: LibraryEntry, pick: string): LandingBurn => ({ ...e, pick, family: fam(e) });

  const used = new Set<string>();
  const take = (list: LibraryEntry[], key: (e: LibraryEntry) => number, pick: string): LandingBurn | null => {
    const best = [...list].filter((e) => !used.has(e.experimentId)).sort((a, b) => key(b) - key(a))[0];
    if (!best) return null;
    used.add(best.experimentId);
    return withFam(best, pick);
  };
  const steady = library.filter((e) => e.visibleS >= 10);

  // Picks rank by burn duration (robust), not by peak area (a lit chamber can inflate it).
  const long = (e: LibraryEntry) => e.visibleS;
  const hero = [
    take(library.filter((e) => fam(e) === "rod-sphere"), long, "Longest rod / sphere burn"),
    take(library.filter((e) => fam(e) === "film-slab"), long, "Longest film / slab burn"),
    take(library.filter((e) => fam(e) === "fabric-other"), long, "Longest fabric burn"),
    take(steady.filter((e) => e.o2Pct != null), (e) => -(e.o2Pct ?? 99), "Lowest oxygen"),
  ].filter((b): b is LandingBurn => b !== null);

  used.clear();
  const six = [
    take(library, long, "Longest burn"),
    take(library.filter((e) => fam(e) === "rod-sphere"), long, "Longest rod / sphere burn"),
    take(library.filter((e) => fam(e) === "fabric-other"), long, "Longest fabric burn"),
    take(steady.filter((e) => e.o2Pct != null), (e) => -(e.o2Pct ?? 99), "Lowest oxygen"),
    take(steady.filter((e) => e.airflowCmS != null), (e) => e.airflowCmS ?? -1, "Fastest airflow"),
    take(steady.filter((e) => e.o2Pct != null), (e) => e.o2Pct ?? -1, "Highest oxygen"),
  ].filter((b): b is LandingBurn => b !== null);

  const points: LandingPoint[] = [];
  let unplotted = 0;
  for (const e of dataset.experiments) {
    const air = representativeAirflow(e);
    const o2 = e.conditions.o2InitialPct;
    if (air == null || o2 == null) {
      unplotted += 1;
      continue;
    }
    points.push({ id: e.id, testId: e.testId, o2, air, family: fuelFamily(e.fuel) });
  }

  const yearsSet = [...new Set(dataset.experiments.map((e) => e.date?.slice(0, 4)).filter((y): y is string => Boolean(y)))].sort();
  const years = yearsSet.length > 1 ? `${yearsSet[0]}–${yearsSet[yearsSet.length - 1]}` : yearsSet[0] ?? "";

  return {
    runs: stats.totalRuns,
    teams: stats.piCount,
    years,
    o2Range: stats.o2Range ? [stats.o2Range.min, stats.o2Range.max] : null,
    airflowRange: stats.airflowRange ? [stats.airflowRange.min, stats.airflowRange.max] : null,
    videos: stats.mp4Count,
    videoGb: stats.mp4Bytes / 1e9,
    measured: flameLibraryEntries(dataset).length,
    hero,
    six,
    points,
    unplotted,
  };
}
