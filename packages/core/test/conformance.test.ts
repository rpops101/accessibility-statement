import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  computeConformance,
  criteriaForAxeRule,
  criterionFromAxeTag,
  enClauseFor,
  getEnStandard,
  getWcagStandard,
  loadEvidence,
  mergeEvidence,
  type EvidenceModel,
  type Finding,
} from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function evidenceOf(findings: Finding[], manual: EvidenceModel['manual'] = []): EvidenceModel {
  return mergeEvidence(
    [{ path: 'test.json', reader: 'axe', urls: [], findings }],
    manual
  );
}

const finding = (over: Partial<Finding> = {}): Finding => ({
  ruleId: 'image-alt',
  source: 'axe',
  outcome: 'fail',
  criteria: ['1.1.1'],
  selectors: ['#hero > img'],
  ...over,
});

test('QA-2: every WCAG 2.1 AA criterion is mapped or explicitly manual-only', () => {
  const wcag = getWcagStandard('2.1');
  const en = getEnStandard('3.2.1');

  // The set of criteria some shipped axe rule can actually reach.
  const ruleTable = parseYaml(
    readFileSync(join(import.meta.dirname, '..', 'data', 'rules', 'axe.yaml'), 'utf8')
  ) as { rules: Record<string, string[]> };
  const mappedByTool = new Set<string>();
  for (const rule of Object.keys(ruleTable.rules)) {
    for (const criterion of criteriaForAxeRule(rule)) mappedByTool.add(criterion);
  }

  const gaps: string[] = [];
  for (const c of wcag.criteria) {
    // Every criterion must have an EN 301 549 clause...
    const clause = enClauseFor(en, c.id);
    if (!clause) {
      gaps.push(`${c.id} has no EN 301 549 clause`);
      continue;
    }
    // ...and must be reachable either by a shipped rule mapping or by the
    // manual checklist. A criterion declared fully automatable that no rule
    // maps to is a silent gap — exactly what this test exists to catch.
    const automatable = mappedByTool.has(c.id);
    const manualOnly = c.automation !== 'full';
    if (!automatable && !manualOnly) {
      gaps.push(`${c.id} claims automation: full but no shipped rule maps to it`);
    }
    if (manualOnly && !c.manualGuidance) {
      gaps.push(`${c.id} needs manual evaluation but ships no guidance`);
    }
  }
  assert.deepEqual(gaps, [], `mapping gaps:\n${gaps.join('\n')}`);

  // The reverse direction: a rule mapping to a criterion that does not
  // exist in any shipped standard is a typo that would silently never fire.
  const known = new Set([
    ...wcag.criteria.map((c) => c.id),
    ...getWcagStandard('2.2').criteria.map((c) => c.id),
  ]);
  const dangling = [...mappedByTool].filter((id) => !known.has(id));
  assert.deepEqual(dangling, [], `rule table maps to unknown criteria: ${dangling.join(', ')}`);
});

test('EN 301 549 chapter 9 mirrors WCAG numbering and reserves non-web chapters (FR-MAP-5)', () => {
  const en = getEnStandard('3.2.1');
  for (const clause of en.clauses) {
    assert.equal(clause.chapter, 9);
    assert.equal(clause.id, `9.${clause.wcag}`);
  }
  // Space for hardware/software/document clauses exists without a schema change.
  assert.deepEqual(en.reservedChapters, [5, 6, 7, 8, 10, 11, 12, 13]);
});

test('standard versions are pluggable (FR-MAP-4)', () => {
  const w21 = getWcagStandard('2.1');
  const w22 = getWcagStandard('2.2');
  const ids21 = new Set(w21.criteria.map((c) => c.id));
  const ids22 = new Set(w22.criteria.map((c) => c.id));
  // WCAG 2.2 drops 4.1.1 Parsing and adds six A/AA criteria.
  assert.ok(ids21.has('4.1.1'));
  assert.ok(!ids22.has('4.1.1'));
  for (const added of ['2.4.11', '2.5.7', '2.5.8', '3.2.6', '3.3.7', '3.3.8']) {
    assert.ok(ids22.has(added), `WCAG 2.2 should contain ${added}`);
    assert.ok(!ids21.has(added), `WCAG 2.1 should not contain ${added}`);
  }
  const model = computeConformance(evidenceOf([finding()]), { wcagVersion: '2.2' });
  assert.equal(model.wcagVersion, '2.2');
  assert.equal(model.results.length, w22.criteria.length);
});

test('axe wcag tags parse into criteria unambiguously', () => {
  assert.equal(criterionFromAxeTag('wcag111'), '1.1.1');
  assert.equal(criterionFromAxeTag('wcag1410'), '1.4.10');
  assert.equal(criterionFromAxeTag('wcag412'), '4.1.2');
  assert.equal(criterionFromAxeTag('wcag2aa'), undefined);
  assert.equal(criterionFromAxeTag('best-practice'), undefined);
});

test('precedence: automated fail beats automated pass (FR-MAP-2)', () => {
  const model = computeConformance(
    evidenceOf([
      finding({ outcome: 'pass', url: 'https://example.org/a' }),
      finding({ outcome: 'fail', url: 'https://example.org/b' }),
    ])
  );
  const r = model.results.find((x) => x.criterion.id === '1.1.1')!;
  assert.equal(r.status, 'fail');
  assert.equal(r.decidedBy, 'automated-fail');
});

test('precedence: manual overrides automation, and the conflict is surfaced (FR-MAP-2)', () => {
  const model = computeConformance(
    evidenceOf([finding({ criteria: ['1.4.3'], ruleId: 'color-contrast' })], [
      { criterion: '1.4.3', status: 'pass', evidence: 'Verified manually.' },
    ])
  );
  const r = model.results.find((x) => x.criterion.id === '1.4.3')!;
  assert.equal(r.status, 'pass');
  assert.equal(r.decidedBy, 'manual');
  // Never silently resolved: the overridden failure is recorded.
  assert.equal(r.conflicts.length, 1);
  assert.match(r.conflicts[0]!.description, /overrides 1 automated failure/);
  assert.ok(r.trace.some((t) => t.source === 'manual'));
  assert.ok(r.trace.some((t) => t.ruleId === 'color-contrast'));
});

test('precedence: a not-evaluated manual entry does not decide the criterion', () => {
  const model = computeConformance(
    evidenceOf([finding({ outcome: 'pass' })], [{ criterion: '1.1.1', status: 'not-evaluated' }])
  );
  const r = model.results.find((x) => x.criterion.id === '1.1.1')!;
  assert.equal(r.status, 'pass');
  assert.equal(r.decidedBy, 'automated-pass');
});

test('precedence: disagreeing manual entries take the most severe and flag it', () => {
  const model = computeConformance(
    evidenceOf([], [
      { criterion: '1.2.2', status: 'pass', evidence: 'Reviewer A' },
      { criterion: '1.2.2', status: 'fail', evidence: 'Reviewer B' },
    ])
  );
  const r = model.results.find((x) => x.criterion.id === '1.2.2')!;
  assert.equal(r.status, 'fail');
  assert.equal(r.conflicts.length, 1);
  assert.match(r.conflicts[0]!.description, /disagree/);
});

test('incomplete findings never decide a status but stay in the trace', () => {
  const model = computeConformance(
    evidenceOf([finding({ ruleId: 'video-caption', criteria: ['1.2.2'], outcome: 'incomplete' })])
  );
  const r = model.results.find((x) => x.criterion.id === '1.2.2')!;
  assert.equal(r.status, 'not-evaluated');
  assert.equal(r.decidedBy, 'default');
  assert.equal(r.trace.length, 1);
  assert.equal(r.trace[0]!.outcome, 'incomplete');
});

test('unmapped failing rules are preserved, not dropped', () => {
  const model = computeConformance(
    evidenceOf([finding({ ruleId: 'region', criteria: [], outcome: 'fail' })])
  );
  assert.equal(model.unmappedFindings.length, 1);
  assert.equal(model.unmappedFindings[0]!.ruleId, 'region');
});

test('every conclusion traces to criterion → clause → file → rule → selector (FR-MAP-3)', () => {
  const evidence = loadEvidence([join(FIXTURES, 'axe-basic.json')]);
  const model = computeConformance(evidence);
  const r = model.results.find((x) => x.criterion.id === '1.1.1')!;
  assert.equal(r.clause, '9.1.1.1');
  const entry = r.trace.find((t) => t.ruleId === 'image-alt')!;
  assert.ok(entry.file?.endsWith('axe-basic.json'));
  assert.deepEqual(entry.urls, ['https://example.org/']);
  assert.deepEqual(entry.selectors, ['#hero > img', '.teaser img.logo']);
});

test('compliance level is conservative about unevaluated criteria', () => {
  const wcag = getWcagStandard('2.1');
  // Everything passing except unevaluated ⇒ partial, never full.
  const allPass = computeConformance(
    evidenceOf(wcag.criteria.map((c) => finding({ criteria: [c.id], outcome: 'pass' })))
  );
  assert.equal(allPass.summary.totals['not-evaluated'], 0);
  assert.equal(allPass.summary.compliance, 'full');

  const oneMissing = computeConformance(
    evidenceOf(
      wcag.criteria.slice(1).map((c) => finding({ criteria: [c.id], outcome: 'pass' }))
    )
  );
  assert.equal(oneMissing.summary.compliance, 'partial');

  const nothingPasses = computeConformance(
    evidenceOf(wcag.criteria.map((c) => finding({ criteria: [c.id], outcome: 'fail' })))
  );
  assert.equal(nothingPasses.summary.compliance, 'non-compliant');
});

test('conformance computation is deterministic across evidence file order (FR-ART-5)', () => {
  const a = computeConformance(
    loadEvidence([join(FIXTURES, 'axe-basic.json'), join(FIXTURES, 'pa11y-ci.json')], {
      manualPath: join(FIXTURES, 'manual.yaml'),
    })
  );
  const b = computeConformance(
    loadEvidence([join(FIXTURES, 'pa11y-ci.json'), join(FIXTURES, 'axe-basic.json')], {
      manualPath: join(FIXTURES, 'manual.yaml'),
    })
  );
  assert.deepEqual(a, b);
});
