import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  buildOpenAcr,
  computeConformance,
  getWcagStandard,
  loadEvidence,
  parseConfig,
  renderArtifact,
  validateSchema,
} from '../src/index.js';

/**
 * Acceptance criterion 2: `render acr --format openacr` must validate
 * against the OpenACR schema. The structural schema lives next to this
 * test and is checked offline in every CI run (NFR-1).
 */

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PACKS = join(import.meta.dirname, '..', '..', 'packs', 'packs');
const SCHEMA = JSON.parse(
  readFileSync(join(import.meta.dirname, 'openacr.schema.json'), 'utf8')
) as Record<string, unknown>;

const ADHERENCE_LEVELS = [
  'supports',
  'partially-supports',
  'does-not-support',
  'not-applicable',
  'not-evaluated',
];

function project() {
  const configPath = join(PACKS, 'eu', 'fixture', 'config.yaml');
  const config = parseConfig(readFileSync(configPath, 'utf8'), configPath);
  const evidence = loadEvidence([join(FIXTURES, 'axe-basic.json')], {
    manualPath: join(FIXTURES, 'manual.yaml'),
  });
  return { config, conformance: computeConformance(evidence) };
}

test('OpenACR output validates against the schema (acceptance criterion 2)', () => {
  const { config, conformance } = project();
  const doc = buildOpenAcr(conformance, config);
  const issues = validateSchema(doc, SCHEMA);
  assert.deepEqual(
    issues,
    [],
    `OpenACR schema violations:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`
  );
});

test('the serialized YAML round-trips and still validates', () => {
  const { config, conformance } = project();
  const yaml = renderArtifact(conformance, config, undefined, {
    kind: 'acr',
    format: 'openacr',
  }).content;
  const parsed = parseYaml(yaml);
  assert.deepEqual(validateSchema(parsed, SCHEMA), []);

  const json = JSON.parse(
    renderArtifact(conformance, config, undefined, { kind: 'acr', format: 'json' }).content
  );
  assert.deepEqual(validateSchema(json, SCHEMA), []);
  // YAML and JSON must describe the same document.
  assert.deepEqual(parsed, json);
});

test('every criterion entry uses the OpenACR adherence vocabulary', () => {
  const { config, conformance } = project();
  const doc = buildOpenAcr(conformance, config) as unknown as {
    chapters: Record<string, { criteria: Array<{ num: string; components: Array<{ name: string; adherence: { level: string; notes: string } }> }> }>;
  };

  let count = 0;
  for (const [chapterName, chapter] of Object.entries(doc.chapters)) {
    assert.ok(Array.isArray(chapter.criteria), `${chapterName} has no criteria array`);
    for (const criterion of chapter.criteria) {
      assert.match(criterion.num, /^\d+\.\d+\.\d+$/, `bad criterion number ${criterion.num}`);
      assert.ok(criterion.components.length > 0, `${criterion.num} has no components`);
      for (const component of criterion.components) {
        assert.equal(component.name, 'web');
        assert.ok(
          ADHERENCE_LEVELS.includes(component.adherence.level),
          `${criterion.num}: "${component.adherence.level}" is not an OpenACR adherence level`
        );
        assert.ok(component.adherence.notes.length > 0, `${criterion.num}: empty notes`);
      }
      count++;
    }
  }

  // Every A/AA criterion of the selected standard is reported — an ACR
  // that silently omits criteria is not a conformance report.
  assert.equal(count, getWcagStandard('2.1').criteria.length);
});

test('the ACR carries a legal disclaimer regardless of review state', () => {
  const { config, conformance } = project();
  const doc = buildOpenAcr(conformance, config) as unknown as { legal_disclaimer: string };
  assert.match(doc.legal_disclaimer, /does not constitute legal advice/);

  const reviewed = buildOpenAcr(conformance, {
    ...config,
    review: { reviewedBy: 'Jane Doe', reviewedOn: '2026-08-01' },
  }) as unknown as { legal_disclaimer: string };
  assert.match(reviewed.legal_disclaimer, /does not constitute legal advice/);
});
