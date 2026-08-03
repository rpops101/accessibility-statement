import type {
  ComplianceLevel,
  Conflict,
  ConformanceModel,
  CriterionResult,
  CriterionStatus,
  EvidenceModel,
  Finding,
  ManualEntry,
  TraceEntry,
} from '../types.js';
import { getEnStandard, getWcagStandard, enClauseFor } from './standards.js';
import { compareDotted, sortedUnique } from '../util/stable.js';

export interface ConformanceOptions {
  wcagVersion?: string; // default "2.1"
  enVersion?: string; // default "3.2.1"
}

/**
 * Documented, deterministic status precedence (FR-MAP-2):
 *
 *   1. A manual checklist entry with status ≠ not-evaluated always decides
 *      the criterion (humans override tools). If automated failures exist
 *      and the manual status is pass/not-applicable, a conflict is
 *      recorded and surfaced — never silently resolved.
 *      Multiple manual entries for one criterion: the most severe status
 *      wins (fail > partial > pass > not-applicable), and the disagreement
 *      is recorded as a conflict.
 *   2. Otherwise any automated `fail` finding ⇒ fail.
 *   3. Otherwise any automated `pass` finding ⇒ pass.
 *   4. Otherwise ⇒ not-evaluated.
 *
 * `incomplete` findings never change a status; they appear in the trace as
 * needs-review signals. `inapplicable` findings are kept in the evidence
 * model but produce no trace entries (no signal).
 */
export function computeConformance(
  evidence: EvidenceModel,
  opts: ConformanceOptions = {}
): ConformanceModel {
  const wcag = getWcagStandard(opts.wcagVersion ?? '2.1');
  const en = getEnStandard(opts.enVersion ?? '3.2.1');

  const findingsByCriterion = new Map<string, Array<{ finding: Finding; file: string }>>();
  const unmapped: Finding[] = [];
  for (const file of evidence.files) {
    for (const finding of file.findings) {
      if (finding.criteria.length === 0) {
        if (finding.outcome === 'fail' || finding.outcome === 'incomplete') {
          unmapped.push(finding);
        }
        continue;
      }
      for (const criterion of finding.criteria) {
        let list = findingsByCriterion.get(criterion);
        if (!list) findingsByCriterion.set(criterion, (list = []));
        list.push({ finding, file: file.path });
      }
    }
  }

  const manualByCriterion = new Map<string, ManualEntry[]>();
  for (const entry of evidence.manual) {
    let list = manualByCriterion.get(entry.criterion);
    if (!list) manualByCriterion.set(entry.criterion, (list = []));
    list.push(entry);
  }

  const severity: Record<string, number> = {
    fail: 4,
    partial: 3,
    pass: 2,
    'not-applicable': 1,
    'not-evaluated': 0,
  };

  const results: CriterionResult[] = wcag.criteria.map((criterion) => {
    const auto = (findingsByCriterion.get(criterion.id) ?? []).sort(
      (a, b) =>
        a.file.localeCompare(b.file) ||
        a.finding.ruleId.localeCompare(b.finding.ruleId) ||
        (a.finding.url ?? '').localeCompare(b.finding.url ?? '')
    );
    const manualEntries = manualByCriterion.get(criterion.id) ?? [];
    const conflicts: Conflict[] = [];
    const trace: TraceEntry[] = [];

    for (const entry of manualEntries) {
      trace.push({
        source: 'manual',
        outcome: entry.status,
        urls: [],
        selectors: [],
        message: entry.evidence || undefined,
      });
    }
    for (const { finding, file } of auto) {
      if (finding.outcome === 'inapplicable') continue;
      trace.push({
        source: finding.source,
        file,
        ruleId: finding.ruleId,
        outcome: finding.outcome,
        urls: finding.url ? [finding.url] : [],
        selectors: finding.selectors,
        message: finding.message,
      });
    }

    const autoFails = auto.filter((a) => a.finding.outcome === 'fail');
    const autoPasses = auto.filter((a) => a.finding.outcome === 'pass');

    const decisiveManual = manualEntries.filter((m) => m.status !== 'not-evaluated');
    let status: CriterionStatus;
    let decidedBy: CriterionResult['decidedBy'];

    if (decisiveManual.length > 0) {
      const sorted = [...decisiveManual].sort(
        (a, b) => (severity[b.status] ?? 0) - (severity[a.status] ?? 0)
      );
      status = sorted[0]!.status;
      decidedBy = 'manual';
      if (new Set(decisiveManual.map((m) => m.status)).size > 1) {
        conflicts.push({
          criterion: criterion.id,
          description: `Multiple manual entries disagree (${sorted
            .map((m) => m.status)
            .join(' vs ')}); the most severe status was applied.`,
          entries: trace.filter((t) => t.source === 'manual'),
        });
      }
      if (autoFails.length > 0 && (status === 'pass' || status === 'not-applicable')) {
        conflicts.push({
          criterion: criterion.id,
          description: `Manual status "${status}" overrides ${autoFails.length} automated failure(s) — verify the manual evidence.`,
          entries: trace.filter((t) => t.outcome === 'fail' && t.source !== 'manual'),
        });
      }
    } else if (autoFails.length > 0) {
      status = 'fail';
      decidedBy = 'automated-fail';
    } else if (autoPasses.length > 0) {
      status = 'pass';
      decidedBy = 'automated-pass';
    } else {
      status = 'not-evaluated';
      decidedBy = 'default';
    }

    const clause = enClauseFor(en, criterion.id);
    return {
      criterion,
      clause: clause?.id,
      clauseTitle: clause?.title,
      status,
      trace,
      conflicts,
      decidedBy,
    };
  });

  const totals: Record<CriterionStatus, number> = {
    pass: 0,
    fail: 0,
    partial: 0,
    'not-applicable': 0,
    'not-evaluated': 0,
  };
  for (const r of results) totals[r.status]++;

  unmapped.sort(
    (a, b) => a.ruleId.localeCompare(b.ruleId) || (a.url ?? '').localeCompare(b.url ?? '')
  );

  return {
    wcagVersion: wcag.version,
    enVersion: en.version,
    results,
    summary: {
      compliance: complianceLevel(totals, results.length),
      totals,
      criteriaCount: results.length,
    },
    unmappedFindings: unmapped,
    urls: evidence.urls,
  };
}

/**
 * Compliance status for the statement (FR-ART-1), conservative by design:
 *   - non-compliant: nothing passes and something fails
 *   - partial: any fail/partial, or any criterion left not-evaluated
 *   - full: every criterion is pass or not-applicable
 * A statement can honestly claim full compliance only when everything was
 * actually evaluated.
 */
export function complianceLevel(
  totals: Record<CriterionStatus, number>,
  criteriaCount: number
): ComplianceLevel {
  const failing = totals.fail + totals.partial;
  if (failing > 0 && totals.pass === 0) return 'non-compliant';
  if (failing > 0 || totals['not-evaluated'] > 0) return 'partial';
  return 'full';
}

/** Criteria ids in a stable, numeric-aware order — for renderers. */
export function sortCriterionIds(ids: Iterable<string>): string[] {
  return sortedUnique(ids).sort(compareDotted);
}
