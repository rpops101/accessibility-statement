import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildLock,
  diffLock,
  serializeLock,
  parseConfig,
  loadConfig,
  validatePackDir,
  validatePackMeta,
  computeConformance,
  mergeEvidence,
  stableJson,
  sortKeysDeep,
  compareDotted,
  validateSchema,
  EaaKitError,
  type LockFile,
} from '../src/index.js';

const PACKS = join(import.meta.dirname, '..', '..', 'packs', 'packs');

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'eaa-kit-test-'));
}

const MINIMAL_CONFIG = `
organisation:
  name: Test Org
product:
  name: Test Product
jurisdiction: de
languages: [de]
evidence:
  paths: ["axe.json"]
dates:
  preparation: "2026-07-01"
`;

test('config validation reports every problem at once, with paths', () => {
  const err = catchError(() =>
    parseConfig(
      `
organisation: {}
product:
  name: X
jurisdiction: DEU
languages: []
evidence: {}
dates:
  preparation: "01/07/2026"
`,
      'eaa.config.yaml'
    )
  );
  const why = err.why ?? '';
  assert.match(why, /organisation\.name: required property missing/);
  assert.match(why, /jurisdiction: does not match pattern/);
  assert.match(why, /languages: must have at least 1 items/);
  assert.match(why, /evidence\.paths: required property missing/);
  assert.match(why, /dates\.preparation: must be an ISO date/);
  assert.ok(err.docs);
});

test('a minimal valid config parses', () => {
  const config = parseConfig(MINIMAL_CONFIG, 'eaa.config.yaml');
  assert.equal(config.organisation.name, 'Test Org');
  assert.deepEqual(config.languages, ['de']);
});

test('a missing config file points at init', () => {
  const err = catchError(() => loadConfig(join(tempDir(), 'nope.yaml')));
  assert.match(err.fix ?? '', /eaa-kit init/);
});

test('lock file records one status per criterion and serializes stably', () => {
  const conformance = computeConformance(mergeEvidence([], []));
  const lock = buildLock(conformance);
  assert.equal(lock.lockVersion, 1);
  assert.equal(Object.keys(lock.criteria).length, conformance.results.length);
  assert.equal(serializeLock(lock), serializeLock(buildLock(conformance)));
  // Keys are sorted, so git diffs stay meaningful.
  const serialized = serializeLock(lock);
  const order = [...serialized.matchAll(/"(\d+\.\d+\.\d+)":/g)].map((m) => m[1]!);
  assert.deepEqual(order, [...order].sort());
});

test('lock diff classifies regressions, improvements and neutral moves', () => {
  const baseline: LockFile = {
    lockVersion: 1,
    wcagVersion: '2.1',
    enVersion: '3.2.1',
    criteria: {
      '1.1.1': 'pass',
      '1.4.3': 'pass',
      '2.4.1': 'fail',
      '3.3.1': 'not-evaluated',
      '4.1.1': 'pass',
    },
  };
  const current: LockFile = {
    lockVersion: 1,
    wcagVersion: '2.2',
    enVersion: '3.2.1',
    criteria: {
      '1.1.1': 'fail', // regression
      '1.4.3': 'not-evaluated', // regression: losing coverage is a regression
      '2.4.1': 'pass', // improvement
      '3.3.1': 'pass', // improvement
      '2.5.8': 'pass', // added by the standard change
      // 4.1.1 removed by the standard change
    },
  };
  const diff = diffLock(baseline, current);
  assert.deepEqual(
    diff.regressions.map((r) => r.criterion),
    ['1.1.1', '1.4.3']
  );
  assert.deepEqual(
    diff.improvements.map((r) => r.criterion),
    ['2.4.1', '3.3.1']
  );
  assert.deepEqual(
    diff.neutral.map((r) => `${r.criterion}:${r.from}→${r.to}`),
    ['2.5.8:absent→pass', '4.1.1:pass→absent']
  );
});

test('pass → not-applicable is not a regression', () => {
  const lock = (status: string): LockFile => ({
    lockVersion: 1,
    wcagVersion: '2.1',
    enVersion: '3.2.1',
    criteria: { '1.2.1': status as LockFile['criteria'][string] },
  });
  assert.equal(diffLock(lock('pass'), lock('not-applicable')).regressions.length, 0);
  assert.equal(diffLock(lock('not-applicable'), lock('fail')).regressions.length, 1);
});

test('every shipped pack validates against the schema (REQ-PACK-2)', () => {
  for (const code of ['eu', 'de', 'fr', 'es', 'it', 'ie']) {
    const result = validatePackDir(join(PACKS, code), { fallbackTemplatesDir: join(PACKS, 'eu') });
    assert.deepEqual(result.issues, [], `${code}: ${JSON.stringify(result.issues)}`);
    assert.deepEqual(result.warnings, [], `${code}: ${result.warnings.join('; ')}`);
  }
});

test('pack schema rejects the mistakes contributors actually make', () => {
  const base = {
    schemaVersion: 1,
    country: 'pt',
    name: 'Portugal',
    languages: ['pt'],
    defaultLanguage: 'pt',
    legal: { act: 'Decreto-Lei', sources: ['https://example.pt'] },
    enforcement: { name: 'Some Authority' },
    quality: 'bronze',
  };
  assert.deepEqual(validatePackMeta(base), []);

  const message = (meta: unknown) => validatePackMeta(meta).map((i) => `${i.path}: ${i.message}`).join('; ');
  assert.match(message({ ...base, country: 'PT' }), /country: does not match pattern/);
  assert.match(message({ ...base, quality: 'platinum' }), /quality: must be one of/);
  assert.match(message({ ...base, defaultLanguage: 'en' }), /defaultLanguage.*not in languages/);
  assert.match(message({ ...base, legal: { act: 'x', sources: ['ftp://x'] } }), /sources\[0\]/);
  assert.match(message({ ...base, legal: { act: 'x', sources: [] } }), /at least 1 items/);
  assert.match(message({ ...base, enforcement: {} }), /enforcement\.name: required/);
  assert.match(message({ ...base, unexpectedKey: 1 }), /unknown property/);
});

test('Silver and Gold require verified enforcement details', () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, 'pack.yaml'),
    `schemaVersion: 1
country: pt
name: Portugal
languages: [pt]
defaultLanguage: pt
legal:
  act: Decreto-Lei
  sources: ["https://example.pt"]
enforcement:
  name: Some Authority
quality: silver
`
  );
  writeFileSync(join(dir, 'strings.pt.yaml'), '{}\n');
  const result = validatePackDir(dir, { fallbackTemplatesDir: join(PACKS, 'eu') });
  const messages = result.issues.map((i) => i.message).join('; ');
  assert.match(messages, /enforcement-body URL/);
  assert.match(messages, /enforcement\.verified/);
  rmSync(dir, { recursive: true, force: true });
});

test('a declared language with no strings file is an error, not a silent English fallback', () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, 'pack.yaml'),
    `schemaVersion: 1
country: pt
name: Portugal
languages: [pt, en]
defaultLanguage: pt
legal:
  act: Decreto-Lei
  sources: ["https://example.pt"]
enforcement:
  name: Some Authority
quality: bronze
`
  );
  writeFileSync(join(dir, 'strings.pt.yaml'), '{}\n');
  const result = validatePackDir(dir, { fallbackTemplatesDir: join(PACKS, 'eu') });
  assert.match(result.issues.map((i) => i.message).join('; '), /strings\.en\.yaml is missing/);
  rmSync(dir, { recursive: true, force: true });
});

test('an unfinished scaffold does not pass validation', () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, 'pack.yaml'),
    `schemaVersion: 1
country: pt
name: TODO
languages: [pt]
defaultLanguage: pt
legal:
  act: TODO
  sources: ["https://TODO"]
enforcement:
  name: TODO
quality: bronze
`
  );
  writeFileSync(join(dir, 'strings.pt.yaml'), 'statement:\n  title: "TODO: Accessibility statement"\n');
  const result = validatePackDir(dir, { fallbackTemplatesDir: join(PACKS, 'eu') });
  assert.equal(result.ok, false);
  const paths = result.issues.map((i) => i.path);
  assert.ok(paths.includes('$.name'));
  assert.ok(paths.includes('$.legal.act'));
  assert.ok(paths.includes('strings.pt.yaml.statement.title'));
  rmSync(dir, { recursive: true, force: true });
});

test('a directory without pack.yaml explains how to scaffold one', () => {
  const dir = tempDir();
  mkdirSync(join(dir, 'empty'));
  const result = validatePackDir(join(dir, 'empty'));
  assert.equal(result.ok, false);
  assert.match(result.issues[0]!.message, /pack\.yaml is missing/);
  rmSync(dir, { recursive: true, force: true });
});

test('determinism helpers behave (FR-ART-5)', () => {
  assert.equal(stableJson({ b: 1, a: { d: 2, c: 3 } }), '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}\n');
  assert.deepEqual(Object.keys(sortKeysDeep({ z: 1, a: 2 })), ['a', 'z']);
  // Numeric-aware ordering: 1.4.2 sorts before 1.4.10.
  assert.deepEqual(['1.4.10', '1.4.2', '1.1.1'].sort(compareDotted), ['1.1.1', '1.4.2', '1.4.10']);
});

test('microschema validates the constructs our schemas use', () => {
  const schema = {
    type: 'object',
    required: ['a'],
    additionalProperties: false,
    properties: {
      a: { type: 'string', minLength: 2 },
      n: { type: 'number', minimum: 1, maximum: 10 },
      e: { enum: ['x', 'y'] },
      list: { type: 'array', minItems: 1, items: { type: 'string' } },
      d: { type: 'string', format: 'date' },
    },
  };
  assert.deepEqual(validateSchema({ a: 'ok' }, schema), []);
  const messages = (v: unknown) => validateSchema(v, schema).map((i) => `${i.path}: ${i.message}`);
  assert.deepEqual(messages({}), ['$.a: required property missing']);
  assert.deepEqual(messages({ a: 'x' }), ['$.a: must be at least 2 characters']);
  assert.deepEqual(messages({ a: 'ok', n: 99 }), ['$.n: must be <= 10']);
  assert.deepEqual(messages({ a: 'ok', e: 'z' }), ['$.e: must be one of: x, y']);
  assert.deepEqual(messages({ a: 'ok', list: [] }), ['$.list: must have at least 1 items']);
  assert.deepEqual(messages({ a: 'ok', list: [1] }), ['$.list[0]: expected string, got integer']);
  assert.deepEqual(messages({ a: 'ok', n: 2.5 }), []); // "number" accepts integers and floats
  assert.deepEqual(messages({ a: 'ok', d: 'yesterday' }), ['$.d: must be an ISO date (YYYY-MM-DD)']);
  assert.deepEqual(messages({ a: 'ok', extra: 1 }), ['$.extra: unknown property']);
});

function catchError(fn: () => unknown): EaaKitError {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof EaaKitError, `expected EaaKitError, got ${String(e)}`);
    return e;
  }
  assert.fail('expected the call to throw');
}
