// Render every artifact, for every pack, in every language, from the
// packs' own fixtures.
//
// Used by three CI jobs: the cross-OS determinism comparison (FR-ART-5),
// the axe-core dogfood gate (FR-ART-6) and local inspection:
//
//   node scripts/render-corpus.mjs out-dir
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(root, 'packages/core/dist/esm/index.js')).href);
const { computeConformance, loadEvidence, loadPack, parseConfig, renderArtifact } = core;

const PACKS = join(root, 'packages/packs/packs');
const outDir = resolve(process.argv[2] ?? 'corpus-out');

const TARGETS = [
  ['statement', 'html'],
  ['statement', 'md'],
  ['acr', 'openacr'],
  ['acr', 'html'],
  ['acr', 'md'],
  ['burden', 'html'],
  ['burden', 'md'],
  ['trace', 'html'],
  ['trace', 'md'],
  ['trace', 'json'],
  // Binary formats are in the corpus precisely because they are the ones
  // most likely to pick up a timestamp and break determinism.
  ['statement', 'docx'],
  ['statement', 'pdf'],
  ['acr', 'docx'],
  ['burden', 'docx'],
  ['burden', 'pdf'],
  ['trace', 'pdf'],
];

const codes = readdirSync(PACKS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let count = 0;
for (const code of codes) {
  const packDir = join(PACKS, code);
  const configPath = join(packDir, 'fixture', 'config.yaml');
  const config = parseConfig(readFileSync(configPath, 'utf8'), configPath);
  const pack = loadPack(packDir, { fallbackTemplatesDir: join(PACKS, 'eu') });
  // basePath so the trace artifact cites "axe.json" rather than this
  // machine's absolute path. Without it the corpus is not comparable across
  // machines, which is the whole point of rendering it.
  const fixtureDir = join(packDir, 'fixture');
  const evidence = loadEvidence(
    config.evidence.paths.map((p) => join(fixtureDir, p)),
    { basePath: fixtureDir }
  );
  const conformance = computeConformance(evidence, {
    wcagVersion: config.standards?.wcag,
    enVersion: config.standards?.en301549,
  });

  for (const lang of pack.meta.languages) {
    for (const [kind, format] of TARGETS) {
      const artifact = renderArtifact(conformance, config, pack, { kind, format, lang });
      const dir = join(outDir, code, lang);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, artifact.filenameHint), artifact.bytes ?? artifact.content);
      count++;
    }
  }
}

console.log(`rendered ${count} artifacts for ${codes.length} packs into ${outDir}`);
