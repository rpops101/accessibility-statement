import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  buildOpenAcr,
  computeConformance,
  loadEvidence,
  loadPack,
  parseConfig,
  reassessmentDate,
  renderArtifact,
  renderTemplate,
  lintTemplate,
  escapeHtml,
  EaaKitError,
  type ConformanceModel,
  type EaaConfig,
  type Pack,
} from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PACKS = join(import.meta.dirname, '..', '..', 'packs', 'packs');

function setup(configOverrides: Partial<EaaConfig> = {}): {
  conformance: ConformanceModel;
  config: EaaConfig;
  pack: Pack;
} {
  const configPath = join(PACKS, 'eu', 'fixture', 'config.yaml');
  const base = parseConfig(readFileSync(configPath, 'utf8'), configPath);
  const config = { ...base, ...configOverrides } as EaaConfig;
  const evidence = loadEvidence([join(FIXTURES, 'axe-basic.json')], {
    manualPath: join(FIXTURES, 'manual.yaml'),
  });
  return {
    conformance: computeConformance(evidence),
    config,
    pack: loadPack(join(PACKS, 'eu'), { fallbackTemplatesDir: join(PACKS, 'eu') }),
  };
}

test('template engine is logic-less and escapes by default (NFR-9)', () => {
  assert.equal(renderTemplate('{{a}}', { a: '<script>alert(1)</script>' }), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(renderTemplate('{{#list}}[{{.}}]{{/list}}', { list: ['a', 'b'] }), '[a][b]');
  assert.equal(renderTemplate('{{#o}}{{x}}{{/o}}', { o: { x: 1 } }), '1');
  assert.equal(renderTemplate('{{^empty}}none{{/empty}}', { empty: [] }), 'none');
  assert.equal(renderTemplate('{{#s}}{{.}}{{/s}}', { s: 'v' }), 'v');
  assert.equal(renderTemplate('{{! hidden }}x', {}), 'x');
  assert.equal(renderTemplate('{{missing}}', {}), '');

  // There is no expression evaluation to exploit — a template cannot run code.
  assert.equal(renderTemplate('{{a.b.c}}', { a: { b: { c: 'deep' } } }), 'deep');
  // ...and it cannot escape its data via the prototype chain.
  assert.equal(renderTemplate('{{constructor}}', {}), '');
  assert.equal(renderTemplate('{{__proto__}}', {}), '');
  assert.equal(renderTemplate('{{a.constructor.name}}', { a: {} }), '');
  assert.equal(renderTemplate('{{#constructor}}x{{/constructor}}', {}), '');
  assert.equal(renderTemplate('{{toString}}', {}), '');
});

test('template parse errors name the offending section', () => {
  assert.throws(() => renderTemplate('{{#a}}x', {}), /unclosed section \{\{#a\}\}/);
  assert.throws(() => renderTemplate('{{#a}}x{{/b}}', {}), /does not match open section/);
  assert.deepEqual(lintTemplate('{{#a}}{{/a}}'), []);
  assert.match(lintTemplate('{{{raw}}}')[0]!, /raw \{\{\{/);
});

test('escapeHtml covers the attribute-breaking characters', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});

test('statement lists non-accessible content with EN clause references (FR-ART-1)', () => {
  const { conformance, config, pack } = setup();
  const html = renderArtifact(conformance, config, pack, { kind: 'statement', format: 'html' }).content;
  assert.match(html, /<html lang="en">/);
  assert.match(html, /1\.1\.1/);
  assert.match(html, /9\.1\.1\.1/);
  assert.match(html, /Images must have alternative text/);
  // Self-contained: no external assets (FR-ART-1).
  assert.doesNotMatch(html, /<link[^>]+href=|<script|src="http/);
  // Feedback and enforcement sections are mandatory content.
  assert.match(html, /Feedback and contact information/);
  assert.match(html, /Enforcement procedure/);
});

test('draft watermark is present until both review fields are given (FR-ART-7)', () => {
  const { conformance, config, pack } = setup();
  for (const kind of ['statement', 'acr', 'burden'] as const) {
    const draft = renderArtifact(conformance, config, pack, { kind, format: 'html' }).content;
    assert.match(draft, /DRAFT/, `${kind} must carry the draft watermark`);
    assert.match(draft, /does not constitute legal advice/, `${kind} must carry the disclaimer`);

    // Only one half of the review information is not enough.
    const half = renderArtifact(conformance, config, pack, {
      kind,
      format: 'html',
      reviewedBy: 'Jane Doe',
    }).content;
    assert.match(half, /DRAFT/, `${kind} must stay a draft without a review date`);

    const reviewed = renderArtifact(conformance, config, pack, {
      kind,
      format: 'html',
      reviewedBy: 'Jane Doe',
      reviewedOn: '2026-08-01',
    }).content;
    assert.doesNotMatch(reviewed, /DRAFT/, `${kind} watermark must clear when reviewed`);
    assert.match(reviewed, /Jane Doe/);
    assert.match(reviewed, /2026-08-01/);
  }
});

test('ACR is OpenACR-shaped and the renderings are views over it (FR-ART-2)', () => {
  const { conformance, config } = setup();
  const doc = buildOpenAcr(conformance, config) as Record<string, any>;
  for (const key of ['title', 'product', 'author', 'report_date', 'chapters', 'catalog']) {
    assert.ok(key in doc, `OpenACR document must have ${key}`);
  }
  const levelA = doc['chapters'].success_criteria_level_a.criteria;
  assert.ok(levelA.length > 0);
  for (const criterion of levelA) {
    assert.match(criterion.num, /^\d+\.\d+\.\d+$/);
    assert.equal(criterion.components.length, 1);
    assert.match(
      criterion.components[0].adherence.level,
      /^(supports|does-not-support|partially-supports|not-applicable|not-evaluated)$/
    );
  }

  const yaml = renderArtifact(conformance, config, undefined, { kind: 'acr', format: 'openacr' }).content;
  const roundTripped = parseYaml(yaml);
  assert.equal(roundTripped.catalog, doc['catalog']);
  assert.equal(
    roundTripped.chapters.success_criteria_level_a.criteria.length,
    levelA.length
  );

  const html = renderArtifact(conformance, config, undefined, { kind: 'acr', format: 'html' }).content;
  assert.match(html, /does-not-support/);
  const md = renderArtifact(conformance, config, undefined, { kind: 'acr', format: 'md' }).content;
  assert.match(md, /\| --- \|/);
});

test('the ACR reflects manual overrides, not just tool output', () => {
  const { conformance, config } = setup();
  const doc = buildOpenAcr(conformance, config) as Record<string, any>;
  const all = [
    ...doc['chapters'].success_criteria_level_a.criteria,
    ...doc['chapters'].success_criteria_level_aa.criteria,
  ];
  // manual.yaml marks 1.4.3 as a manual pass over an automated failure.
  const contrast = all.find((c: { num: string }) => c.num === '1.4.3');
  assert.equal(contrast.components[0].adherence.level, 'supports');
  // ...and 1.2.2 as a manual failure no tool could have found.
  const captions = all.find((c: { num: string }) => c.num === '1.2.2');
  assert.equal(captions.components[0].adherence.level, 'does-not-support');
});

test('burden worksheet computes the 5-year reassessment date (FR-ART-3)', () => {
  assert.equal(reassessmentDate('2026-07-01'), '2031-07-01');
  assert.equal(reassessmentDate('2024-02-29'), '2029-03-01'); // no 29 Feb in 2029
  assert.throws(() => reassessmentDate('01/07/2026'), EaaKitError);

  const { conformance, config } = setup({
    dates: { preparation: '2026-07-01', burdenAssessment: '2026-09-15' },
    burden: {
      claimed: true,
      exclusions: [{ scope: 'Legacy PDF archive', reason: 'Cost exceeds benefit' }],
      costBenefit: { estimatedCost: 'EUR 40k' },
    },
  } as Partial<EaaConfig>);
  const md = renderArtifact(conformance, config, undefined, { kind: 'burden', format: 'md' }).content;
  assert.match(md, /2026-09-15/);
  assert.match(md, /2031-09-15/);
  assert.match(md, /Legacy PDF archive/);
  assert.match(md, /EUR 40k/);
  assert.match(md, /Article 14/);
});

test('micro-enterprise check reports all three states (FR-ART-3)', () => {
  const { conformance, config } = setup();
  const render = (organisation: EaaConfig['organisation']) =>
    renderArtifact(conformance, { ...config, organisation }, undefined, {
      kind: 'burden',
      format: 'md',
    }).content;

  assert.match(render({ name: 'Tiny', employees: 4, turnoverEUR: 500_000 }), /are exempt|micro-enterprise definition\./);
  assert.match(render({ name: 'Big', employees: 400, turnoverEUR: 90_000_000 }), /does not meet the micro-enterprise/);
  assert.match(render({ name: 'Unknown' }), /could not be performed/);
  // Exactly on the boundary: 10 employees is no longer a micro-enterprise.
  assert.match(render({ name: 'Ten', employees: 10, turnoverEUR: 1 }), /does not meet the micro-enterprise/);
});

test('trace artifact exposes the full chain and surfaced conflicts (FR-MAP-3)', () => {
  const { conformance, config } = setup();
  const json = JSON.parse(
    renderArtifact(conformance, config, undefined, { kind: 'trace', format: 'json' }).content
  );
  const contrast = json.criteria.find((c: { criterion: string }) => c.criterion === '1.4.3');
  assert.equal(contrast.status, 'pass');
  assert.equal(contrast.decidedBy, 'manual');
  assert.equal(contrast.clause, '9.1.4.3');
  assert.ok(contrast.conflicts.length > 0, 'the manual override must be surfaced');
  assert.ok(contrast.evidence.some((e: { ruleId: string }) => e.ruleId === 'color-contrast'));

  const md = renderArtifact(conformance, config, undefined, { kind: 'trace', format: 'md' }).content;
  assert.match(md, /Surfaced conflicts/);
  assert.match(md, /color-contrast/);
});

test('rendering is byte-identical across repeated runs (FR-ART-5)', () => {
  const { conformance, config, pack } = setup();
  const kinds = [
    { kind: 'statement', format: 'html' },
    { kind: 'statement', format: 'md' },
    { kind: 'acr', format: 'openacr' },
    { kind: 'acr', format: 'html' },
    { kind: 'burden', format: 'html' },
    { kind: 'trace', format: 'json' },
  ] as const;
  for (const target of kinds) {
    const a = renderArtifact(conformance, config, pack, target).content;
    const b = renderArtifact(conformance, config, pack, target).content;
    assert.equal(a, b, `${target.kind}/${target.format} is not deterministic`);
    // No wall-clock leakage: today's date must never appear unless configured.
    const today = new Date().toISOString().slice(0, 10);
    if (today !== config.dates.preparation) {
      assert.ok(!a.includes(today), `${target.kind}/${target.format} leaked the wall clock`);
    }
  }
});

test('unsupported format and missing pack produce guidance, not a crash', () => {
  const { conformance, config } = setup();
  assert.throws(
    () => renderArtifact(conformance, config, undefined, { kind: 'statement', format: 'html' }),
    /requires a jurisdiction pack/
  );
  const { pack } = setup();
  assert.throws(
    () => renderArtifact(conformance, config, pack, { kind: 'statement', format: 'json' }),
    /not supported/
  );
});

test('requesting a language the pack does not ship names the alternatives', () => {
  const { conformance, config, pack } = setup();
  try {
    renderArtifact(conformance, config, pack, { kind: 'statement', format: 'html', lang: 'zz' });
    assert.fail('expected a throw');
  } catch (e) {
    assert.ok(e instanceof EaaKitError);
    assert.match(e.why ?? '', /Available languages: en/);
    assert.match(e.fix ?? '', /strings\.zz\.yaml/);
  }
});
