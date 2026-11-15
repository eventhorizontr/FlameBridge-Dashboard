import { LEARN_MODULES, STARTING_RANK, type LearnModule } from "./curriculum";

/** Share of gate questions that must be answered correctly to pass a module. */
export const PASS_RATIO = 0.8;

export interface ModuleResult {
  readonly score: number;
  readonly total: number;
  /** ISO timestamp of the first pass. */
  readonly passedAt: string;
}

export type CompletedMap = Readonly<Record<string, ModuleResult>>;

export function passThreshold(questionCount: number): number {
  return Math.ceil(questionCount * PASS_RATIO);
}

export function hasPassed(score: number, total: number): boolean {
  return total > 0 && score >= passThreshold(total);
}

/** A module is open when it is the first one or the previous module has been passed. */
export function isUnlocked(index: number, completed: CompletedMap, modules: readonly LearnModule[] = LEARN_MODULES): boolean {
  if (index <= 0) return true;
  const previous = modules[index - 1];
  return Boolean(previous && completed[previous.id]);
}

export function earnedXp(completed: CompletedMap, modules: readonly LearnModule[] = LEARN_MODULES): number {
  return modules.reduce((sum, m) => sum + (completed[m.id] ? m.xp : 0), 0);
}

export function completedCount(completed: CompletedMap, modules: readonly LearnModule[] = LEARN_MODULES): number {
  return modules.filter((m) => completed[m.id]).length;
}

/** Rank = the rank of the furthest passed module in curriculum order. */
export function currentRank(completed: CompletedMap, modules: readonly LearnModule[] = LEARN_MODULES): string {
  let rank = STARTING_RANK;
  for (const m of modules) {
    if (completed[m.id]) rank = m.rank;
  }
  return rank;
}

/** Index of the first module not yet passed, or -1 when every module is complete. */
export function nextModuleIndex(completed: CompletedMap, modules: readonly LearnModule[] = LEARN_MODULES): number {
  return modules.findIndex((m) => !completed[m.id]);
}
