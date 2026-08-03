import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeConformance,
  loadEvidence,
  loadPack,
  parseConfig,
  renderArtifact,
  type ArtifactKind,
} from '../src/index.js';
import { checkHtmlAccessibility } from './html-a11y.js';

/**
 * FR-ART-6 / QA-4: the HTML eaa-kit generates must itself be accessible.
 * A compliance tool that emits inaccessible documents has no credibility.
 *
 * This runs the structural checker over every artifact of every pack in
 * every language. CI additionally runs real axe-core against the same
 * files (the `dogfood` job).
 */

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PACKS = join(import.meta.dirname, '..', '..', 'packs', 'packs');

const packCodes = readdirSync(PACKS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

test('the checker itself catches the failures it claims to catch', () => {
  // A checker that never fails would make the dogfood gate meaningless.
  const bad = `<!DOCTYPE html><html><head></head><body>
    <img src="x.png">
    <h1>One</h1><h3>Skipped</h3>
    <a href="/x"></a>
    <p id="dup"></p><p id="dup"></p>
    <table><tr><td>no headers</td></tr></table>
  </body></html>`;
  const rules = new Set(checkHtmlAccessibility(bad).map((i) => i.rule));
  for (const expected of [
    'html-has-lang',
    'document-title',
    'image-alt',
    'heading-order',
    'link-name',
    'duplicate-id',
    'th-has-data-cells',
    'region',
  ]) {
    assert.ok(rules.has(expected), `checker should have reported ${expected}`);
  }

  const good = `<!DOCTYPE html><html lang="en"><head><title>Ok</title></head><body>
    <main><h1>One</h1><h2>Two</h2><img src="x.png" alt="A chart"><a href="/x">Link</a></main>
  </body></html>`;
  assert.deepEqual(checkHtmlAccessibility(good), []);
});

for (const code of packCodes) {
  test(`generated HTML is accessible: ${code} (FR-ART-6)`, () => {
    const configPath = join(PACKS, code, 'fixture', 'config.yaml');
    const config = parseConfig(readFileSync(configPath, 'utf8'), configPath);
    const pack = loadPack(join(PACKS, code), { fallbackTemplatesDir: join(PACKS, 'eu') });
    const evidence = loadEvidence([join(FIXTURES, 'axe-basic.json')], {
      manualPath: join(FIXTURES, 'manual.yaml'),
    });
    const conformance = computeConformance(evidence);

    for (const lang of pack.meta.languages) {
      for (const kind of ['statement', 'acr', 'burden', 'trace'] as ArtifactKind[]) {
        const html = renderArtifact(conformance, config, pack, {
          kind,
          format: 'html',
          lang,
        }).content;
        const issues = checkHtmlAccessibility(html);
        assert.deepEqual(
          issues,
          [],
          `${code}/${lang}/${kind}: ${issues.map((i) => `${i.rule}: ${i.detail}`).join('; ')}`
        );
      }
    }
  });
}

test('generated HTML stays self-contained and offline (NFR-1, FR-ART-1)', () => {
  const configPath = join(PACKS, 'de', 'fixture', 'config.yaml');
  const config = parseConfig(readFileSync(configPath, 'utf8'), configPath);
  const pack = loadPack(join(PACKS, 'de'), { fallbackTemplatesDir: join(PACKS, 'eu') });
  const conformance = computeConformance(loadEvidence([join(FIXTURES, 'axe-basic.json')]));

  for (const kind of ['statement', 'acr', 'burden', 'trace'] as ArtifactKind[]) {
    const html = renderArtifact(conformance, config, pack, { kind, format: 'html', lang: 'de' }).content;
    assert.doesNotMatch(html, /<script/i, `${kind} must contain no scripts`);
    assert.doesNotMatch(html, /<link[^>]+rel=["']?stylesheet/i, `${kind} must not link stylesheets`);
    assert.doesNotMatch(html, /src=["']https?:/i, `${kind} must not load remote assets`);
    assert.doesNotMatch(html, /@import/i, `${kind} must not @import stylesheets`);
    // Links to the enforcement body are content, not assets — those are fine.
  }
});
