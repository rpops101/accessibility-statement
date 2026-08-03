// Check that every URL a jurisdiction pack cites still resolves.
//
//   node scripts/check-pack-links.mjs          # all packs
//   node scripts/check-pack-links.mjs de fr    # selected packs
//
// This is a **maintainer tool**, not part of the engine. accessibility-statement itself
// never touches the network (NFR-1); this script exists so a scheduled job
// can tell us when a government reorganises its website, rather than a user
// discovering it from a dead link in a legal document.
//
// It cannot check that a URL points at the *right* body — mlbf.de returned
// 200 for a cable-assembly manufacturer while the real German authority is
// at mlbf-barrierefrei.de. Only a human reading the page can confirm that,
// which is what enforcement.verified records.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PACKS = join(root, 'packages/packs/packs');

const only = process.argv.slice(2);
const codes = readdirSync(PACKS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((c) => only.length === 0 || only.includes(c))
  .sort();

// Some official sites reject unknown clients outright; a 403 from a
// government WAF is not evidence that a page is gone.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

async function check(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(25_000),
    });
    return { status: response.status, finalUrl: response.url };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

const problems = [];
let checked = 0;

for (const code of codes) {
  const meta = parse(readFileSync(join(PACKS, code, 'pack.yaml'), 'utf8'));
  const urls = new Set();
  for (const source of meta.legal?.sources ?? []) urls.add(source);
  if (meta.enforcement?.url) urls.add(meta.enforcement.url);
  if (meta.enforcement?.conciliation?.url) urls.add(meta.enforcement.conciliation.url);

  console.log(`\n${code} — ${meta.name}`);
  if (meta.enforcement?.verified) {
    console.log(`  enforcement details last verified by a human: ${meta.enforcement.verified}`);
  } else if (meta.quality !== 'bronze') {
    problems.push(`${code}: quality "${meta.quality}" but enforcement.verified is not set`);
  }

  for (const url of [...urls].sort()) {
    const { status, finalUrl, error } = await check(url);
    checked++;
    const redirected = finalUrl && finalUrl !== url && finalUrl !== `${url}/`;
    if (status >= 200 && status < 300) {
      console.log(`  ${status} ${url}${redirected ? `\n        → ${finalUrl}` : ''}`);
      // A cross-host redirect means the body moved or was reorganised, and
      // the pack is citing a stale home. A same-host redirect is normally
      // just canonicalisation (adding a locale or a landing path), so it is
      // reported but does not fail the run.
      if (redirected && new URL(finalUrl).host !== new URL(url).host) {
        problems.push(
          `${code}: ${url} redirects to a different host (${finalUrl}) — the body may have moved; re-read the destination and update the pack`
        );
      }
    } else if (status === 403 || status === 429) {
      console.log(`  ${status} ${url}  (blocked by the site's bot protection — check by hand)`);
    } else {
      console.log(`  ${status || 'ERR'} ${url}  ${error ?? ''}`);
      problems.push(`${code}: ${url} returned ${status || error}`);
    }
  }
}

console.log(`\nChecked ${checked} URLs across ${codes.length} packs.`);
if (problems.length > 0) {
  console.log('\nProblems:');
  for (const problem of problems) console.log(`  - ${problem}`);
  console.log(
    '\nA dead or redirected link in a pack sends someone to the wrong place with a\n' +
      'legal complaint. Fix the pack, re-read the destination, and update\n' +
      'enforcement.verified to the date you checked.'
  );
  process.exit(1);
}
console.log('All pack links resolve.');
