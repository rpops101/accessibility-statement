import type { EvidenceFile, Finding, FindingOutcome } from '../../types.js';
import type { EvidenceReader } from '../registry.js';
import { criteriaForLighthouseAudit } from '../../mapping/rules.js';

interface LhAuditDetailsItem {
  node?: { selector?: string };
}
interface LhAudit {
  id: string;
  title?: string;
  description?: string;
  score: number | null;
  scoreDisplayMode?: string;
  details?: { items?: LhAuditDetailsItem[] };
}
interface LhReport {
  lighthouseVersion?: string;
  requestedUrl?: string;
  finalUrl?: string;
  finalDisplayedUrl?: string;
  audits?: Record<string, LhAudit>;
  categories?: {
    accessibility?: { auditRefs?: Array<{ id: string }> };
  };
}

function isLighthouse(v: unknown): v is LhReport {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as LhReport).lighthouseVersion === 'string' &&
    typeof (v as LhReport).audits === 'object' &&
    (v as LhReport).audits !== null
  );
}

function outcomeOf(audit: LhAudit): FindingOutcome | undefined {
  switch (audit.scoreDisplayMode) {
    case 'notApplicable':
      return 'inapplicable';
    case 'manual':
    case 'informative':
      return 'incomplete';
    default:
      if (audit.score === null) return 'incomplete';
      return audit.score >= 1 ? 'pass' : 'fail';
  }
}

/** Reader for Lighthouse JSON reports (accessibility category only). */
export const lighthouseReader: EvidenceReader = {
  name: 'lighthouse',
  formatLabel: 'Lighthouse JSON report (accessibility category, Lighthouse ≥ 10)',

  detect(parsed: unknown): boolean {
    return isLighthouse(parsed);
  },

  read(parsed: unknown, path: string): EvidenceFile {
    const report = parsed as LhReport;
    const url = report.finalDisplayedUrl ?? report.finalUrl ?? report.requestedUrl;
    const refs = report.categories?.accessibility?.auditRefs ?? [];
    const findings: Finding[] = [];
    for (const ref of [...refs].sort((a, b) => a.id.localeCompare(b.id))) {
      const audit = report.audits?.[ref.id];
      if (!audit) continue;
      const outcome = outcomeOf(audit);
      if (!outcome) continue;
      findings.push({
        ruleId: audit.id,
        source: 'lighthouse',
        outcome,
        criteria: criteriaForLighthouseAudit(audit.id),
        url,
        selectors: (audit.details?.items ?? [])
          .map((i) => i.node?.selector)
          .filter((s): s is string => typeof s === 'string')
          .sort(),
        message: audit.title,
      });
    }
    return {
      path,
      reader: 'lighthouse',
      tool: 'lighthouse',
      toolVersion: report.lighthouseVersion,
      urls: url ? [url] : [],
      findings,
    };
  },
};
