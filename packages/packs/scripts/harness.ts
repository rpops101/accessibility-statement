/**
 * Shared pack snapshot harness (QA-1): renders every pack's statement in
 * every declared language and format from the pack's own fixture.
 * Used by both the test suite and scripts/update-snapshots.ts — the CI
 * gate and the contributor tool are the same code path (QA-6).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeConformance,
  loadEvidence,
  loadPack,
  parseConfig,
  renderStatement,
  validatePackDir,
  type Pack,
  type PackValidationResult,
} from '@accessibility-statement/core';

export const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs');
export const FALLBACK_DIR = join(PACKS_DIR, 'eu');

export function listPackDirs(): string[] {
  return readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function validate(code: string): PackValidationResult {
  return validatePackDir(join(PACKS_DIR, code), { fallbackTemplatesDir: FALLBACK_DIR });
}

export interface Rendered {
  lang: string;
  format: 'html' | 'md';
  snapshotPath: string;
  content: string;
}

/** Render all statement variants for one pack from its fixture. */
export function renderPackFixture(code: string): { pack: Pack; rendered: Rendered[] } {
  const dir = join(PACKS_DIR, code);
  const pack = loadPack(dir, { fallbackTemplatesDir: FALLBACK_DIR });
  const fixtureDir = join(dir, 'fixture');
  const configPath = join(fixtureDir, 'config.yaml');
  const config = parseConfig(readFileSync(configPath, 'utf8'), configPath);
  const evidencePaths = config.evidence.paths.map((p) => join(fixtureDir, p));
  const manualPath = config.evidence.manual ? join(fixtureDir, config.evidence.manual) : undefined;
  const evidence = loadEvidence(evidencePaths, { manualPath });
  const conformance = computeConformance(evidence, {
    wcagVersion: config.standards?.wcag,
    enVersion: config.standards?.en301549,
  });
  const rendered: Rendered[] = [];
  for (const lang of pack.meta.languages) {
    for (const format of ['html', 'md'] as const) {
      const artifact = renderStatement(conformance, config, pack, { lang, format });
      // Snapshot paths must not depend on where the repo is checked out —
      // strip the absolute fixture prefix from any embedded paths.
      const content = artifact.content.split(fixtureDir).join('fixture');
      rendered.push({
        lang,
        format,
        snapshotPath: join(dir, 'snapshots', `statement.${lang}.${format}`),
        content,
      });
    }
  }
  return { pack, rendered };
}

/** Write snapshots to disk (contributor flow: npm run update-snapshots). */
export function updateSnapshots(code: string): string[] {
  const { rendered } = renderPackFixture(code);
  const written: string[] = [];
  for (const r of rendered) {
    mkdirSync(dirname(r.snapshotPath), { recursive: true });
    writeFileSync(r.snapshotPath, r.content);
    written.push(r.snapshotPath);
  }
  return written;
}

export function readSnapshot(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}
