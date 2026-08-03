/**
 * Push the site's URLs to search engines via IndexNow.
 *
 *   node scripts/indexnow.mjs [--dry-run]
 *
 * IndexNow is the one submission route that needs no account: ownership is
 * proved by hosting a key file, so this can run from CI. Bing, DuckDuckGo,
 * Yandex, Seznam and Naver consume it, and one submission reaches all of
 * them. Google does not participate — it discovers through the sitemap
 * submitted in Search Console, which needs a human with the account.
 *
 * Ownership check: the key file must live at or above every URL submitted.
 * Ours sits inside the project path, and every URL is under that path, so
 * the scope is satisfied. See https://www.indexnow.org/documentation
 *
 * This talks to the network, which the engine never does (NFR-1). It is a
 * maintenance script, not part of the product, and nothing in the build
 * depends on it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dryRun = process.argv.includes('--dry-run');

const ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://rpops101.github.io';
const BASE = (process.env['BASE_PATH'] ?? '/accessibility-statement').replace(/\/$/, '');

const keyFile = join(root, 'site', '.indexnow-key');
if (!existsSync(keyFile)) {
  console.error(
    'No IndexNow key at site/.indexnow-key.\n' +
      'Generate one, and host it as site/public/<key>.txt so ownership can be verified:\n' +
      "  node -e \"const k=require('crypto').randomBytes(16).toString('hex');" +
      "require('fs').writeFileSync('site/.indexnow-key',k);" +
      "require('fs').writeFileSync('site/public/'+k+'.txt',k);console.log(k)\""
  );
  process.exit(1);
}
const key = readFileSync(keyFile, 'utf8').trim();
const keyLocation = `${ORIGIN}${BASE}/${key}.txt`;

/*
 * Take the URL list from the *deployed* sitemap rather than a local build.
 * Submitting what is actually live is the correct semantics — telling a
 * search engine about a page that has not deployed yet earns a crawl of a
 * 404 — and it means this needs no build step at all. Falls back to a local
 * sitemap when offline.
 */
const liveSitemap = `${ORIGIN}${BASE}/sitemap.xml`;
let sitemapXml = '';
try {
  const response = await fetch(liveSitemap, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  sitemapXml = await response.text();
  console.log(`sitemap:     ${liveSitemap} (live)`);
} catch (error) {
  const sitemapPath = join(root, 'site', 'dist', 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    console.error(
      `Could not fetch ${liveSitemap} (${error.message}), and there is no local ` +
        `sitemap at ${sitemapPath}.\nDeploy the site, or build it first: npm run site`
    );
    process.exit(1);
  }
  sitemapXml = readFileSync(sitemapPath, 'utf8');
  console.log(`sitemap:     ${sitemapPath} (local fallback)`);
}
const urlList = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (urlList.length === 0) {
  console.error('The sitemap contains no URLs.');
  process.exit(1);
}

console.log(`host:        ${new URL(ORIGIN).host}`);
console.log(`keyLocation: ${keyLocation}`);
console.log(`urls:        ${urlList.length}`);
for (const u of urlList) console.log(`  ${u}`);

if (dryRun) {
  console.log('\n--dry-run: nothing submitted.');
  process.exit(0);
}

// Confirm the key file is actually reachable before submitting. A 404 here
// means every submission is rejected, and the API reports that as a generic
// 403 that is tedious to diagnose.
const keyCheck = await fetch(keyLocation, { signal: AbortSignal.timeout(20_000) }).catch(
  (e) => ({ ok: false, status: 0, statusText: e.message })
);
if (!keyCheck.ok) {
  console.error(
    `\nThe key file is not reachable (${keyCheck.status} ${keyCheck.statusText ?? ''}).\n` +
      `Deploy the site first — ownership cannot be verified without it.`
  );
  process.exit(1);
}
const served = (await keyCheck.text()).trim();
if (served !== key) {
  console.error(`\nThe key file serves "${served}" but the local key is "${key}".`);
  process.exit(1);
}
console.log('\nKey file verified.');

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(ORIGIN).host, key, keyLocation, urlList }),
  signal: AbortSignal.timeout(30_000),
});

const body = await response.text();
console.log(`\nIndexNow responded ${response.status} ${response.statusText}`);
if (body.trim()) console.log(body.trim());

// 200 accepted, 202 accepted pending key validation. Both are success.
if (response.status === 200 || response.status === 202) {
  console.log(
    `\nSubmitted ${urlList.length} URLs. Bing, DuckDuckGo, Yandex, Seznam and Naver ` +
      `consume IndexNow; Google does not, and discovers via the sitemap in Search Console.`
  );
  process.exit(0);
}
console.error('\nSubmission failed.');
process.exit(1);
