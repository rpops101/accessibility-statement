import { parse } from 'yaml';
import type { ManualEntry, ManualStatus, WcagStandard } from '../types.js';
import { A11yStatementError, DOCS_BASE } from '../util/errors.js';

const STATUSES: ManualStatus[] = ['pass', 'fail', 'partial', 'not-applicable', 'not-evaluated'];

interface ManualFile {
  checklist?: Array<{
    criterion?: unknown;
    status?: unknown;
    evidence?: unknown;
    evaluatedBy?: unknown;
  }>;
}

/** Parse and validate a manual checklist (`manual.yaml`). */
export function parseManualChecklist(content: string, path: string): ManualEntry[] {
  let doc: unknown;
  try {
    doc = parse(content);
  } catch (e) {
    throw new A11yStatementError({
      what: `Manual checklist ${path} is not valid YAML.`,
      why: (e as Error).message,
      fix: 'Fix the YAML syntax, or regenerate the template with: accessibility-statement init',
      docs: `${DOCS_BASE}/manual-checklist.md`,
    });
  }
  const file = doc as ManualFile;
  if (!file || !Array.isArray(file.checklist)) {
    throw new A11yStatementError({
      what: `Manual checklist ${path} has no top-level "checklist:" list.`,
      fix: 'Start from the template: accessibility-statement init writes a commented manual.yaml.',
      docs: `${DOCS_BASE}/manual-checklist.md`,
    });
  }
  return file.checklist.map((raw, i) => {
    const criterion = String(raw.criterion ?? '');
    const status = String(raw.status ?? '') as ManualStatus;
    if (!/^\d+\.\d+\.\d+$/.test(criterion)) {
      throw new A11yStatementError({
        what: `Manual checklist ${path}, entry ${i + 1}: "${criterion}" is not a WCAG criterion id.`,
        fix: 'Use dotted ids like 1.2.2.',
        docs: `${DOCS_BASE}/manual-checklist.md`,
      });
    }
    if (!STATUSES.includes(status)) {
      throw new A11yStatementError({
        what: `Manual checklist ${path}, entry ${criterion}: status "${status}" is not valid.`,
        fix: `Use one of: ${STATUSES.join(' | ')}`,
        docs: `${DOCS_BASE}/manual-checklist.md`,
      });
    }
    return {
      criterion,
      status,
      evidence: raw.evidence === undefined ? undefined : String(raw.evidence),
      evaluatedBy: raw.evaluatedBy === undefined ? undefined : String(raw.evaluatedBy),
    };
  });
}

/**
 * Generate the commented manual.yaml template (FR-ING-3): every criterion
 * automation cannot fully judge, with guidance, defaulting to not-evaluated.
 */
export function manualChecklistTemplate(wcag: WcagStandard): string {
  const lines: string[] = [
    '# Manual accessibility checklist for accessibility-statement.',
    `# WCAG ${wcag.version}, levels A and AA — criteria automated tools cannot fully judge.`,
    '# For each criterion set status: pass | fail | partial | not-applicable | not-evaluated',
    '# and describe your evidence (what you did, what you observed).',
    '# Entries here take precedence over automated results, so keep them honest.',
    'checklist:',
  ];
  for (const c of wcag.criteria) {
    if (c.automation === 'full') continue;
    lines.push(`  # ${c.id} ${c.name} (Level ${c.level}) — automation: ${c.automation}`);
    if (c.manualGuidance) lines.push(`  # How to check: ${c.manualGuidance}`);
    lines.push(`  - criterion: "${c.id}"`);
    lines.push('    status: not-evaluated');
    lines.push('    evidence: ""');
    lines.push('');
  }
  return lines.join('\n');
}
