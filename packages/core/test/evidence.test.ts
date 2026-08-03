import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EaaKitError,
  loadEvidence,
  parseManualChecklist,
  readEvidenceContent,
  manualChecklistTemplate,
  getWcagStandard,
  type EvidenceReader,
} from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const fixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

/** Run fn, assert it threw an EaaKitError, and hand the error back. */
function catchEaaError(fn: () => unknown): EaaKitError {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof EaaKitError, `expected an EaaKitError, got ${String(e)}`);
    return e;
  }
  assert.fail('expected the call to throw');
}

test('axe reader keeps violations, incomplete, passes and inapplicable (FR-ING-1)', () => {
  const file = readEvidenceContent(fixture('axe-basic.json'), 'axe.json');
  assert.equal(file.reader, 'axe');
  assert.equal(file.tool, 'axe-core');
  assert.equal(file.toolVersion, '4.10.2');
  assert.deepEqual(file.urls, ['https://example.org/']);

  const outcomes = new Set(file.findings.map((f) => f.outcome));
  assert.deepEqual([...outcomes].sort(), ['fail', 'inapplicable', 'incomplete', 'pass']);

  const imageAlt = file.findings.find((f) => f.ruleId === 'image-alt');
  assert.equal(imageAlt?.outcome, 'fail');
  assert.deepEqual(imageAlt?.criteria, ['1.1.1']);
  assert.deepEqual(imageAlt?.selectors, ['#hero > img', '.teaser img.logo']);
  assert.equal(imageAlt?.impact, 'critical');
  assert.equal(imageAlt?.url, 'https://example.org/');
});

test('axe reader falls back to wcag tags for rules newer than the table', () => {
  const file = readEvidenceContent(fixture('axe-unknown-rule.json'), 'axe.json');
  const future = file.findings.find((f) => f.ruleId === 'some-rule-invented-after-this-release');
  // wcag1410 must parse as 1.4.10, not 1.4.1 + stray 0.
  assert.deepEqual(future?.criteria, ['1.4.10']);

  // Best-practice rules map to no criterion — kept, not guessed at.
  const region = file.findings.find((f) => f.ruleId === 'region');
  assert.deepEqual(region?.criteria, []);
});

test('axe reader accepts an array of per-page results (FR-ING-4)', () => {
  const file = readEvidenceContent(fixture('axe-multipage.json'), 'axe.json');
  assert.deepEqual(file.urls, ['https://example.org/checkout', 'https://example.org/help']);
  const labelFindings = file.findings.filter((f) => f.ruleId === 'label');
  assert.equal(labelFindings.length, 2);
  // Per-URL provenance is retained: the same rule fails on one page and passes on another.
  assert.deepEqual(
    labelFindings.map((f) => [f.url, f.outcome]).sort(),
    [
      ['https://example.org/checkout', 'fail'],
      ['https://example.org/help', 'pass'],
    ]
  );
});

test('pa11y reader parses criteria out of htmlcs codes (FR-ING-2)', () => {
  const file = readEvidenceContent(fixture('pa11y.json'), 'pa11y.json');
  assert.equal(file.reader, 'pa11y');
  const contrast = file.findings.find((f) => f.ruleId.includes('1_4_3'));
  assert.deepEqual(contrast?.criteria, ['1.4.3']);
  assert.equal(contrast?.outcome, 'fail');
  assert.deepEqual(contrast?.selectors, ['#footer > a:nth-child(2)']);

  // pa11y warnings are needs-review signals, not failures.
  const iframe = file.findings.find((f) => f.ruleId.includes('2_4_1'));
  assert.equal(iframe?.outcome, 'incomplete');
});

test('pa11y-ci aggregate format retains per-URL provenance', () => {
  const file = readEvidenceContent(fixture('pa11y-ci.json'), 'pa11y-ci.json');
  assert.deepEqual(file.urls, ['https://example.org/', 'https://example.org/about']);
  const lang = file.findings.find((f) => f.criteria.includes('3.1.1'));
  assert.equal(lang?.url, 'https://example.org/about');
});

test('lighthouse reader maps scores to outcomes (FR-ING-2)', () => {
  const file = readEvidenceContent(fixture('lighthouse.json'), 'lighthouse.json');
  assert.equal(file.reader, 'lighthouse');
  assert.equal(file.toolVersion, '12.2.1');
  const byId = new Map(file.findings.map((f) => [f.ruleId, f]));
  assert.equal(byId.get('image-alt')?.outcome, 'fail');
  assert.equal(byId.get('color-contrast')?.outcome, 'pass');
  assert.equal(byId.get('video-caption')?.outcome, 'inapplicable');
  // Manual audits are needs-review, never a pass.
  assert.equal(byId.get('focus-traps')?.outcome, 'incomplete');
  assert.deepEqual(byId.get('image-alt')?.criteria, ['1.1.1']);
});

test('unknown formats are rejected with the supported list, never guessed (FR-ING-5)', () => {
  const err = catchEaaError(() => readEvidenceContent(fixture('malformed-unknown-tool.json'), 'weird.json'));
  assert.match(err.what, /weird\.json/);
  assert.match(err.fix ?? '', /axe-core/);
  assert.match(err.fix ?? '', /pa11y/);
  assert.match(err.fix ?? '', /Lighthouse/);
  assert.ok(err.docs, 'error must carry a docs link (NFR-8)');
});

test('truncated JSON produces an actionable error, not a crash (QA-3)', () => {
  const err = catchEaaError(() => readEvidenceContent(fixture('malformed-truncated.json'), 'broken.json'));
  assert.match(err.why ?? '', /not valid JSON/);
});

test('a missing evidence file names the file and the config key', () => {
  const err = catchEaaError(() => loadEvidence([join(FIXTURES, 'does-not-exist.json')]));
  assert.match(err.why ?? '', /does not exist/);
  assert.match(err.fix ?? '', /evidence\.paths/);
});

test('evidence files merge across tools with provenance preserved (FR-ING-4)', () => {
  const model = loadEvidence(
    [join(FIXTURES, 'axe-basic.json'), join(FIXTURES, 'pa11y-ci.json')],
    { manualPath: join(FIXTURES, 'manual.yaml') }
  );
  assert.equal(model.files.length, 2);
  assert.deepEqual(model.urls, [
    'https://example.org/',
    'https://example.org/about',
  ]);
  assert.equal(model.manual.length, 5);
  // Every finding still knows which file it came from.
  for (const file of model.files) {
    assert.ok(file.path.endsWith('.json'));
    assert.ok(file.findings.every((f) => typeof f.source === 'string'));
  }
});

test('custom readers plug in without touching the core (FR-ING-6)', () => {
  const waveReader: EvidenceReader = {
    name: 'wave',
    formatLabel: 'WAVE JSON',
    detect: (parsed) =>
      typeof parsed === 'object' && parsed !== null && 'waveVersion' in (parsed as object),
    read: (parsed, path) => ({
      path,
      reader: 'wave',
      urls: [],
      findings: [
        {
          ruleId: 'alt_missing',
          source: 'wave',
          outcome: 'fail',
          criteria: ['1.1.1'],
          selectors: [],
        },
      ],
    }),
  };
  const file = readEvidenceContent('{"waveVersion":"3.1"}', 'wave.json', [waveReader]);
  assert.equal(file.reader, 'wave');
  assert.deepEqual(file.findings[0]?.criteria, ['1.1.1']);
});

test('manual checklist rejects bad ids and statuses with guidance', () => {
  const badId = catchEaaError(() => parseManualChecklist('checklist:\n  - criterion: "1.1"\n    status: pass\n', 'manual.yaml'));
  assert.match(badId.what, /not a WCAG criterion id/);

  const badStatus = catchEaaError(() => parseManualChecklist('checklist:\n  - criterion: "1.1.1"\n    status: maybe\n', 'manual.yaml'));
  assert.match(badStatus.fix ?? '', /not-evaluated/);

  const noList = catchEaaError(() => parseManualChecklist('organisation: {}\n', 'manual.yaml'));
  assert.match(noList.what, /no top-level "checklist:"/);
});

test('manual checklist template covers every non-automatable criterion (FR-ING-3)', () => {
  const wcag = getWcagStandard('2.1');
  const template = manualChecklistTemplate(wcag);
  const notFullyAutomatable = wcag.criteria.filter((c) => c.automation !== 'full');
  assert.ok(notFullyAutomatable.length > 0);
  for (const c of notFullyAutomatable) {
    assert.match(template, new RegExp(`criterion: "${c.id.replace(/\./g, '\\.')}"`), `${c.id} missing`);
    assert.ok(template.includes(c.name), `${c.id} name missing`);
  }
  // Template is valid input to its own parser.
  const parsed = parseManualChecklist(template, 'manual.yaml');
  assert.equal(parsed.length, notFullyAutomatable.length);
  assert.ok(parsed.every((e) => e.status === 'not-evaluated'));
});
