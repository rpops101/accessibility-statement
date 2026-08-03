/**
 * Verify the built site: every page passes axe-core, the generator works,
 * and nothing leaves the browser.
 *
 *   node site/build.mjs /tmp/site-check
 *   node site/test/check-site.mjs            # serves and checks
 *
 * The no-network assertion is the important one. The site's central claim is
 * that a visitor's accessibility test results never leave their machine.
 * That is a property of the architecture rather than a promise, and this is
 * what proves it stays true.
 *
 * Needs playwright and axe-core, which are not repository dependencies:
 *   npm install --no-save playwright axe-core && npx playwright install chromium
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const ROOT = resolve(process.argv[2] ?? '/tmp/site-check');
if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`No built site at ${ROOT}. Run: node site/build.mjs ${ROOT}`);
  process.exit(1);
}
// Pages are built with a base path in CI; strip it when resolving links.
const BASE = process.env['BASE_PATH'] ?? '';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain',
};
const server = createServer((req, res) => {
  let p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(8899, r));

const paths = ['/', '/generator/',
               '/european-accessibility-act/', '/en-301-549/', '/disproportionate-burden/',
               '/vpat-acr-openacr/', '/from-axe-results/',
               '/de/', '/de/en/', '/es/', '/es/en/', '/eu/',
               '/fr/', '/fr/en/', '/ie/', '/ie/ga/', '/it/', '/it/en/', '/404.html'];

let total = 0;

/*
 * Static checks first. A leaked template literal renders as junk attributes
 * that browsers silently swallow and axe never sees, so it has to be caught
 * by looking at the bytes. One shipped in an earlier build of this site.
 */
function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}
for (const file of htmlFiles(ROOT)) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length) || '/';

  // Authored pages are index.html plus 404.html. Anything else with an
  // .html extension is a passthrough asset — a search-engine verification
  // token is plain text that merely uses the extension by convention — and
  // holding it to a page's standards would fail the build for no reason.
  const name = file.split(/[\\/]/).pop();
  if (name !== 'index.html' && name !== '404.html') {
    console.log('  skip  ' + rel + ' (passthrough asset, not a page)');
    continue;
  }
  const problems = [];
  if (/\$\{/.test(html)) problems.push('unresolved template literal (${...}) in the output');
  if (/&lt;(span|div|a) /.test(html)) problems.push('double-escaped markup');
  if (/\bundefined\b/.test(html)) problems.push('the string "undefined" reached the page');
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push('missing or empty <title>');
  if (!/<meta name="description" content="[^"]+"/.test(html)) problems.push('missing meta description');
  if (!/<link rel="canonical"/.test(html)) problems.push('missing canonical link');
  const og = /<meta property="og:image" content="([^"]+)"/.exec(html);
  if (!og) {
    problems.push('missing og:image');
  } else {
    const file = join(ROOT, og[1].replace(/^https?:\/\/[^/]+/, '').replace(BASE, ''));
    if (!existsSync(file)) problems.push('og:image does not exist: ' + og[1]);
  }

  // Structured data has to parse, or it is worse than absent: an invalid
  // block is ignored and the effort is wasted silently.
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(m[1]);
      if (!parsed['@context'] || !parsed['@type']) problems.push('JSON-LD block missing @context or @type');
    } catch (e) {
      problems.push('invalid JSON-LD: ' + e.message);
    }
  }

  // Internal links must resolve. A broken link in the site's own link graph
  // wastes the crawl budget it was added to earn.
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = m[1];
    if (target.startsWith('//')) continue;
    const withoutBase = target.startsWith(BASE) ? target.slice(BASE.length) : target;
    const candidates = [
      join(ROOT, withoutBase),
      join(ROOT, withoutBase, 'index.html'),
    ];
    if (!candidates.some((c) => existsSync(c))) problems.push('broken internal link: ' + target);
  }
  if (problems.length === 0) {
    console.log('  ok    ' + rel + ' (markup)');
  } else {
    total += problems.length;
    console.log('  FAIL  ' + rel);
    for (const p of problems) console.log('          ' + p);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const p of paths) {
  await page.goto('http://localhost:8899' + p, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: axeSource });
  const r = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] },
      resultTypes: ['violations'],
    })
  );
  if (r.violations.length === 0) { console.log('  ok    ' + p); continue; }
  total += r.violations.length;
  console.log('  FAIL  ' + p);
  for (const v of r.violations) {
    console.log('          ' + v.id + ' (' + v.impact + '): ' + v.help);
    console.log('            ' + v.nodes.slice(0,2).map(n => n.target.join(' ')).join(' | '));
  }
}

// Nothing may leave the page. This is the site's whole privacy claim.
const offsite = [];
await page.route('**', (route) => {
  const u = route.request().url();
  if (!u.startsWith('http://localhost:8899')) offsite.push(u);
  route.continue();
});

// The generator with results on screen is a different DOM; check that too.
await page.goto('http://localhost:8899/generator/', { waitUntil: 'networkidle' });
await page.fill('#evidence', readFileSync('packages/packs/packs/eu/fixture/axe.json','utf8'));
await page.click('button[type=submit]');
await page.waitForSelector('#gen-output-wrap:not([hidden])');
await page.addScriptTag({ content: axeSource });
const r2 = await page.evaluate(async () =>
  window.axe.run(document, { runOnly: { type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa'] }, resultTypes:['violations'] })
);
if (r2.violations.length === 0) console.log('  ok    /generator/ (with results rendered)');
else { total += r2.violations.length; console.log('  FAIL  /generator/ (with results)'); for (const v of r2.violations) console.log('          ' + v.id + ': ' + v.help); }

// The document must actually be right, not merely accessible.
const srcdoc = await page.getAttribute('#gen-preview', 'srcdoc');
const checks = [
  ['renders a statement', /Accessibility statement|Erkl\u00e4rung zur Barrierefreiheit/.test(srcdoc ?? '')],
  ['carries the draft notice', /DRAFT|ENTWURF/.test(srcdoc ?? '')],
  ['cites an EN 301 549 clause', /9\.\d+\.\d+\.\d+/.test(srcdoc ?? '')],
  ['offers a download', Boolean(await page.getAttribute('#gen-download', 'download'))],
  ['moves focus to the result', (await page.evaluate(() => document.activeElement?.id)) === 'gen-output-wrap'],
];
for (const [label, ok] of checks) {
  console.log((ok ? '  ok    ' : '  FAIL  ') + label);
  if (!ok) total++;
}

if (offsite.length > 0) {
  console.log('\n  FAIL  the page made off-site requests:');
  for (const u of offsite) console.log('          ' + u);
  total++;
} else {
  console.log('  ok    nothing left the browser');
}

console.log('\n' + (total === 0
  ? 'Site verified: ' + (paths.length + 1) + ' page states, no axe violations, no network egress.'
  : total + ' problem(s).'));
await browser.close();
server.close();
process.exit(total === 0 ? 0 : 1);
