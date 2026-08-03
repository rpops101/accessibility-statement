import type { EvidenceFile, Finding, FindingOutcome } from '../../types.js';
import type { EvidenceReader } from '../registry.js';
import { criteriaForAxeRule } from '../../mapping/rules.js';

interface AxeNode {
  target?: unknown;
  failureSummary?: string;
}
interface AxeRuleResult {
  id: string;
  impact?: string | null;
  description?: string;
  help?: string;
  tags?: string[];
  nodes?: AxeNode[];
}
interface AxeResult {
  url?: string;
  timestamp?: string;
  testEngine?: { name?: string; version?: string };
  violations?: AxeRuleResult[];
  passes?: AxeRuleResult[];
  incomplete?: AxeRuleResult[];
  inapplicable?: AxeRuleResult[];
}

function isAxeResult(v: unknown): v is AxeResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    Array.isArray((v as AxeResult).violations) &&
    Array.isArray((v as AxeResult).passes)
  );
}

function selectorsOf(node: AxeNode): string[] {
  const t = node.target;
  if (!Array.isArray(t)) return [];
  return t.map((s) => (Array.isArray(s) ? s.join(' ') : String(s)));
}

function toFindings(
  results: AxeRuleResult[] | undefined,
  outcome: FindingOutcome,
  url: string | undefined
): Finding[] {
  return (results ?? []).map((r) => ({
    ruleId: r.id,
    source: 'axe',
    outcome,
    criteria: criteriaForAxeRule(r.id, r.tags ?? []),
    url,
    selectors: (r.nodes ?? []).flatMap(selectorsOf).sort(),
    message: r.help ?? r.description,
    impact: r.impact ?? undefined,
  }));
}

/** Reader for axe-core JSON results (single result object or array of them). */
export const axeReader: EvidenceReader = {
  name: 'axe',
  formatLabel: 'axe-core JSON (axe.run() result or array of results, axe ≥ 4.x)',

  detect(parsed: unknown): boolean {
    if (Array.isArray(parsed)) return parsed.length > 0 && parsed.every(isAxeResult);
    return isAxeResult(parsed);
  },

  read(parsed: unknown, path: string): EvidenceFile {
    const results = (Array.isArray(parsed) ? parsed : [parsed]) as AxeResult[];
    const findings: Finding[] = [];
    const urls: string[] = [];
    let tool: string | undefined;
    let toolVersion: string | undefined;
    for (const r of results) {
      if (r.url) urls.push(r.url);
      tool ??= r.testEngine?.name ?? 'axe-core';
      toolVersion ??= r.testEngine?.version;
      findings.push(
        ...toFindings(r.violations, 'fail', r.url),
        ...toFindings(r.incomplete, 'incomplete', r.url),
        ...toFindings(r.passes, 'pass', r.url),
        ...toFindings(r.inapplicable, 'inapplicable', r.url)
      );
    }
    return {
      path,
      reader: 'axe',
      tool,
      toolVersion,
      urls: [...new Set(urls)].sort(),
      findings,
    };
  },
};
