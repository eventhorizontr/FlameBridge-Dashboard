import type { Experiment } from "@/types/experiment";

const qaKeys = {
  o2InitialPct: "o2Initial",
  o2FinalPct: "o2Final",
  co2InitialPct: "co2Initial",
  co2FinalPct: "co2Final",
  coInitialPpm: "coInitial",
  coFinalPpm: "coFinal",
  airflow: "airflow",
} as const;

export function measurementReason(experiment: Experiment, field: keyof typeof qaKeys): string {
  return experiment.qa.flags.find((flag) => flag.startsWith(`${qaKeys[field]}:`)) ??
    (field === "airflow" ? "No valid duct airflow readings" : "Reading unavailable in the source table");
}

export function missingValue(reason: string): string {
  return `— ${reason}`;
}
