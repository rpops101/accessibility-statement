import { parse } from 'yaml';
import { DATA_FILES } from '../generated/data.js';
import { sortedUnique } from '../util/stable.js';

interface AxeRuleTable {
  rules: Record<string, string[]>;
}
interface OverrideTable {
  overrides: Record<string, string[]>;
}

let axeTable: AxeRuleTable | undefined;
let pa11yTable: OverrideTable | undefined;
let lighthouseTable: OverrideTable | undefined;

function getAxeTable(): AxeRuleTable {
  return (axeTable ??= parse(DATA_FILES['rules/axe.yaml']!) as AxeRuleTable);
}
function getPa11yTable(): OverrideTable {
  return (pa11yTable ??= parse(DATA_FILES['rules/pa11y.yaml']!) as OverrideTable);
}
function getLighthouseTable(): OverrideTable {
  return (lighthouseTable ??= parse(DATA_FILES['rules/lighthouse.yaml']!) as OverrideTable);
}

/**
 * Parse an axe `wcagNNN` tag into a criterion id.
 * Guideline numbers are single-digit, so digits split as
 * principle(1) guideline(1) criterion(rest): wcag1410 → 1.4.10.
 */
export function criterionFromAxeTag(tag: string): string | undefined {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  if (!m) return undefined;
  return `${m[1]}.${m[2]}.${Number(m[3])}`;
}

/** Resolve criteria for an axe rule: shipped table first, then wcag tags. */
export function criteriaForAxeRule(ruleId: string, tags: string[] = []): string[] {
  const fromTable = getAxeTable().rules[ruleId];
  if (fromTable) return [...fromTable].sort();
  const fromTags = tags
    .map(criterionFromAxeTag)
    .filter((c): c is string => c !== undefined);
  return sortedUnique(fromTags);
}

/**
 * Resolve criteria for a pa11y/htmlcs code, e.g.
 * `WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail` → 1.4.3.
 */
export function criteriaForPa11yCode(code: string): string[] {
  const override = getPa11yTable().overrides[code];
  if (override) return [...override].sort();
  const m = /(?:^|\.)(\d+)_(\d+)_(\d+)(?:\.|$)/.exec(code);
  if (m) return [`${m[1]}.${m[2]}.${m[3]}`];
  // pa11y with the axe runner reports plain axe rule ids
  return criteriaForAxeRule(code);
}

/** Resolve criteria for a Lighthouse accessibility audit id. */
export function criteriaForLighthouseAudit(auditId: string): string[] {
  const override = getLighthouseTable().overrides[auditId];
  if (override) return [...override].sort();
  return criteriaForAxeRule(auditId);
}
