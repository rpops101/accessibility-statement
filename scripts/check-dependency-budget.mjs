// Enforces NFR-2: at most five runtime dependencies in @accessibility-statement/core, each
// justified in DEPENDENCIES.md. Dependency-heavy packages are actively
// penalised in 2026's supply-chain climate, and a compliance tool cannot
// afford the suspicion.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const MAX = 5;

const pkg = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8'));
const deps = Object.keys(pkg.dependencies ?? {});
const justification = readFileSync(join(root, 'packages/core/DEPENDENCIES.md'), 'utf8');

const problems = [];
if (deps.length > MAX) {
  problems.push(`@accessibility-statement/core has ${deps.length} runtime dependencies; the budget is ${MAX} (NFR-2).`);
}
for (const dep of deps) {
  if (!justification.includes(`\`${dep}\``)) {
    problems.push(`Dependency "${dep}" is not justified in packages/core/DEPENDENCIES.md.`);
  }
}

// The CLI may only depend on our own packages: it is a thin wrapper.
const cli = JSON.parse(readFileSync(join(root, 'packages/cli/package.json'), 'utf8'));
for (const dep of Object.keys(cli.dependencies ?? {})) {
  if (!dep.startsWith('@accessibility-statement/') && dep !== 'accessibility-statement') {
    problems.push(`accessibility-statement CLI depends on "${dep}"; the CLI is a thin wrapper and should add no third-party runtime dependencies.`);
  }
}

// Packs are data only.
const packs = JSON.parse(readFileSync(join(root, 'packages/packs/package.json'), 'utf8'));
if (Object.keys(packs.dependencies ?? {}).length > 0) {
  problems.push('@accessibility-statement/packs must have no runtime dependencies: it ships data, not code.');
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}
console.log(`Dependency budget OK: @accessibility-statement/core has ${deps.length}/${MAX} runtime dependencies (${deps.join(', ') || 'none'}).`);
