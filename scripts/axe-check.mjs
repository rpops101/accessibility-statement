// Run the real axe-core against every generated HTML artifact (FR-ART-6,
// QA-4).
//
//   node scripts/axe-check.mjs <dir>
//
// `npm test` runs a structural stand-in (packages/core/test/dogfood.test.ts)
// so contributors get the check without a browser. This script is the
// authoritative gate and runs in CI, where a browser is available.
//
// Playwright and axe-core are installed ad-hoc by the CI job rather than
// being repository devDependencies: a first-time contributor should not
// download a browser to run `npm test` (DX-2).
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const dir = resolve(process.argv[2] ?? 'corpus-out');

function* htmlFiles(root) {
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const files = [...htmlFiles(dir)];
if (files.length === 0) {
  console.error(`::error::No HTML files under ${dir} — nothing was checked.`);
  process.exit(1);
}

let chromium;
let axeSource;
try {
  ({ chromium } = await import('playwright'));
  axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
} catch (error) {
  console.error(
    '::error::playwright and axe-core are required.\n' +
      'Install them for this run:\n' +
      '  npm install --no-save playwright axe-core && npx playwright install --with-deps chromium'
  );
  console.error(error.message);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

let totalViolations = 0;
const failures = [];

for (const file of files) {
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () =>
    // WCAG 2.1 A/AA is exactly the conformance target the artifacts claim.
    window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    })
  );

  const relative = file.slice(dir.length + 1);
  if (results.violations.length === 0) {
    console.log(`  ok    ${relative}`);
    continue;
  }
  totalViolations += results.violations.length;
  console.log(`  FAIL  ${relative}`);
  for (const violation of results.violations) {
    const targets = violation.nodes
      .flatMap((n) => n.target)
      .slice(0, 5)
      .join(', ');
    const line = `${violation.id} (${violation.impact}): ${violation.help} — ${targets}`;
    console.log(`          ${line}`);
    failures.push(`${relative}: ${line}`);
  }
}

await browser.close();

console.log(`\nChecked ${files.length} generated HTML documents with axe-core.`);
if (totalViolations > 0) {
  for (const failure of failures) console.error(`::error::${failure}`);
  console.error(
    `\n${totalViolations} accessibility violation(s) in eaa-kit's own output. ` +
      `A tool that emits inaccessible accessibility documents has no standing (FR-ART-6).`
  );
  process.exit(1);
}
console.log('No violations. The tool passes its own subject matter.');
