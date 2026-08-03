import type { ConformanceModel, CriterionStatus } from './types.js';
import { stableJson } from './util/stable.js';

/**
 * Conformance baseline (eaa.lock.json) for CI regression mode (FR-CLI-3).
 * Committed to the repo; `eaa-kit check` compares a fresh computation
 * against it and fails on regressions.
 */

export interface LockFile {
  lockVersion: 1;
  wcagVersion: string;
  enVersion: string;
  criteria: Record<string, CriterionStatus>;
}

export function buildLock(conformance: ConformanceModel): LockFile {
  const criteria: Record<string, CriterionStatus> = {};
  for (const r of conformance.results) criteria[r.criterion.id] = r.status;
  return {
    lockVersion: 1,
    wcagVersion: conformance.wcagVersion,
    enVersion: conformance.enVersion,
    criteria,
  };
}

export function serializeLock(lock: LockFile): string {
  return stableJson(lock);
}

/** Rank statuses; movement toward a lower rank is a regression. */
const RANK: Record<CriterionStatus, number> = {
  pass: 4,
  'not-applicable': 4,
  partial: 2,
  'not-evaluated': 1,
  fail: 0,
};

export interface LockChange {
  criterion: string;
  from: CriterionStatus | 'absent';
  to: CriterionStatus | 'absent';
}

export interface LockDiff {
  regressions: LockChange[];
  improvements: LockChange[];
  /** Neutral movements (e.g. criteria added/removed by a standard change). */
  neutral: LockChange[];
}

export function diffLock(baseline: LockFile, current: LockFile): LockDiff {
  const diff: LockDiff = { regressions: [], improvements: [], neutral: [] };
  const ids = [...new Set([...Object.keys(baseline.criteria), ...Object.keys(current.criteria)])].sort();
  for (const id of ids) {
    const from = baseline.criteria[id];
    const to = current.criteria[id];
    if (from === to) continue;
    if (from === undefined) {
      diff.neutral.push({ criterion: id, from: 'absent', to: to! });
    } else if (to === undefined) {
      diff.neutral.push({ criterion: id, from, to: 'absent' });
    } else if (RANK[to] < RANK[from]) {
      diff.regressions.push({ criterion: id, from, to });
    } else if (RANK[to] > RANK[from]) {
      diff.improvements.push({ criterion: id, from, to });
    } else {
      diff.neutral.push({ criterion: id, from, to });
    }
  }
  return diff;
}
