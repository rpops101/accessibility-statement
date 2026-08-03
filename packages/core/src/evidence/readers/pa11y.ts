import type { EvidenceFile, Finding, FindingOutcome } from '../../types.js';
import type { EvidenceReader } from '../registry.js';
import { criteriaForPa11yCode } from '../../mapping/rules.js';

interface Pa11yIssue {
  code: string;
  type?: 'error' | 'warning' | 'notice' | string;
  message?: string;
  selector?: string;
  context?: string;
  runner?: string;
}

function isIssue(v: unknown): v is Pa11yIssue {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Pa11yIssue).code === 'string' &&
    'message' in (v as object) &&
    ('selector' in (v as object) || 'type' in (v as object))
  );
}

/** pa11y-ci aggregate format: { results: { "<url>": [issues] } } */
function isPa11yCi(v: unknown): v is { results: Record<string, Pa11yIssue[]> } {
  if (typeof v !== 'object' || v === null) return false;
  const results = (v as { results?: unknown }).results;
  if (typeof results !== 'object' || results === null || Array.isArray(results)) return false;
  return Object.values(results as Record<string, unknown>).every(
    (arr) => Array.isArray(arr) && arr.every(isIssue)
  );
}

function outcomeOf(issue: Pa11yIssue): FindingOutcome {
  return issue.type === 'error' ? 'fail' : 'incomplete';
}

function toFinding(issue: Pa11yIssue, url: string | undefined): Finding {
  return {
    ruleId: issue.code,
    source: 'pa11y',
    outcome: outcomeOf(issue),
    criteria: criteriaForPa11yCode(issue.code),
    url,
    selectors: issue.selector ? [issue.selector] : [],
    message: issue.message,
    impact: issue.type,
  };
}

/** Reader for pa11y JSON (`pa11y --reporter json`) and pa11y-ci JSON output. */
export const pa11yReader: EvidenceReader = {
  name: 'pa11y',
  formatLabel: 'pa11y JSON (--reporter json) or pa11y-ci JSON (pa11y ≥ 6.x)',

  detect(parsed: unknown): boolean {
    if (Array.isArray(parsed)) return parsed.length > 0 && parsed.every(isIssue);
    return isPa11yCi(parsed);
  },

  read(parsed: unknown, path: string): EvidenceFile {
    const findings: Finding[] = [];
    const urls: string[] = [];
    if (Array.isArray(parsed)) {
      findings.push(...(parsed as Pa11yIssue[]).map((i) => toFinding(i, undefined)));
    } else {
      const results = (parsed as { results: Record<string, Pa11yIssue[]> }).results;
      for (const url of Object.keys(results).sort()) {
        urls.push(url);
        findings.push(...results[url]!.map((i) => toFinding(i, url)));
      }
    }
    return { path, reader: 'pa11y', tool: 'pa11y', urls, findings };
  },
};
