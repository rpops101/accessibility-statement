// Embeds data/**/*.yaml into src/generated/data.ts as raw strings.
// The YAML files stay the single source of truth (data PRs edit them);
// this runs as prebuild/pretest so the engine needs no runtime path
// resolution (works identically in ESM, CJS and bundlers).
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.name.endsWith('.yaml')) yield p;
  }
}

const entries = [];
for (const file of walk(dataDir)) {
  const key = relative(dataDir, file).split('\\').join('/');
  entries.push(`  ${JSON.stringify(key)}: ${JSON.stringify(readFileSync(file, 'utf8'))},`);
}

const out = `// GENERATED FILE — do not edit. Source of truth: packages/core/data/**.
// Regenerate with: npm run build (or node scripts/embed-data.mjs).
export const DATA_FILES: Record<string, string> = {
${entries.join('\n')}
};
`;
mkdirSync(join(root, 'src', 'generated'), { recursive: true });
writeFileSync(join(root, 'src', 'generated', 'data.ts'), out);
console.log(`embedded ${entries.length} data files`);
