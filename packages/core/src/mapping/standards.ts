import { parse } from 'yaml';
import { DATA_FILES } from '../generated/data.js';
import { A11yStatementError, DOCS_BASE } from '../util/errors.js';
import { compareDotted } from '../util/stable.js';
import type { EnStandard, WcagStandard } from '../types.js';

const wcagCache = new Map<string, WcagStandard>();
const enCache = new Map<string, EnStandard>();

function dataFile(key: string): string {
  const content = DATA_FILES[key];
  if (content === undefined) {
    throw new A11yStatementError({
      what: `Standards data file "${key}" is not bundled in this build of @accessibility-statement/core.`,
      why: 'The requested standard version is not shipped (yet).',
      fix: `Available: ${Object.keys(DATA_FILES)
        .filter((k) => k.startsWith('standards/'))
        .join(', ')}`,
      docs: `${DOCS_BASE}/standards.md`,
    });
  }
  return content;
}

/** Load a WCAG standard by version ("2.1" or "2.2"). */
export function getWcagStandard(version = '2.1'): WcagStandard {
  let std = wcagCache.get(version);
  if (!std) {
    std = parse(dataFile(`standards/wcag-${version}.yaml`)) as WcagStandard;
    std.criteria = [...std.criteria].sort((a, b) => compareDotted(a.id, b.id));
    wcagCache.set(version, std);
  }
  return std;
}

/** Load an EN 301 549 standard by version ("3.2.1"). */
export function getEnStandard(version = '3.2.1'): EnStandard {
  let std = enCache.get(version);
  if (!std) {
    std = parse(dataFile(`standards/en301549-${version}.yaml`)) as EnStandard;
    std.clauses = [...std.clauses].sort((a, b) => compareDotted(a.id, b.id));
    enCache.set(version, std);
  }
  return std;
}

/** Map WCAG criterion id → EN clause for a given EN standard. */
export function enClauseFor(en: EnStandard, criterionId: string) {
  return en.clauses.find((c) => c.wcag === criterionId);
}

/** Bundled standard versions, for error messages and `--json` output. */
export function listBundledStandards(): { wcag: string[]; en301549: string[] } {
  const keys = Object.keys(DATA_FILES);
  const pick = (prefix: string) =>
    keys
      .filter((k) => k.startsWith(`standards/${prefix}-`))
      .map((k) => k.slice(`standards/${prefix}-`.length).replace(/\.yaml$/, ''))
      .sort();
  return { wcag: pick('wcag'), en301549: pick('en301549') };
}
