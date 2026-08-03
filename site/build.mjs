/**
 * Build the static site.
 *
 *   node site/build.mjs [outDir]        # default: site/dist
 *   BASE_PATH=/accessibility-statement node site/build.mjs
 *
 * Everything is generated from the jurisdiction packs themselves, so the
 * country pages cannot drift from what the tool actually produces. There is
 * no CMS, no framework, and no runtime: the output is static files.
 *
 * See docs/seo-plan.md for why the country pages exist and why they are
 * only published for packs that really ship.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = join(root, 'site');
const PACKS_DIR = join(root, 'packages/packs/packs');
const outDir = process.argv[2] ? resolve(process.argv[2]) : join(SITE, 'dist');

// Set when deploying to a project page (https://user.github.io/<repo>/).
const BASE = (process.env['BASE_PATH'] ?? '').replace(/\/$/, '');
// Absolute origin, used for canonical URLs and the sitemap.
const ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://rpops101.github.io';
const REPO = 'https://github.com/rpops101/accessibility-statement';

const url = (path) => `${BASE}${path}`;
const absolute = (path) => `${ORIGIN}${BASE}${path}`;

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ *
 * Pack data
 * ------------------------------------------------------------------ */

const codes = readdirSync(PACKS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(PACKS_DIR, e.name, 'pack.yaml')))
  .map((e) => e.name)
  .sort();

const packs = {};
for (const code of codes) {
  const dir = join(PACKS_DIR, code);
  const meta = parse(readFileSync(join(dir, 'pack.yaml'), 'utf8'));

  const strings = {};
  for (const file of readdirSync(dir).sort()) {
    const m = /^strings\.([a-z-]+)\.yaml$/.exec(file);
    if (m) strings[m[1]] = parse(readFileSync(join(dir, file), 'utf8')) ?? {};
  }

  const templatesDir = join(dir, 'templates');
  const templates = {};
  let usesFallbackTemplates = false;
  if (existsSync(templatesDir)) {
    for (const file of readdirSync(templatesDir).sort()) {
      if (file.endsWith('.mustache')) {
        templates[file.replace(/\.mustache$/, '')] = readFileSync(join(templatesDir, file), 'utf8');
      }
    }
  }
  if (Object.keys(templates).length === 0) {
    usesFallbackTemplates = true;
    const fallback = join(PACKS_DIR, 'eu', 'templates');
    for (const file of readdirSync(fallback).sort()) {
      if (file.endsWith('.mustache')) {
        templates[file.replace(/\.mustache$/, '')] = readFileSync(join(fallback, file), 'utf8');
      }
    }
  }
  packs[code] = { meta, strings, templates, usesFallbackTemplates };
}

/** Country pages are published per language; the default language owns /xx/. */
function pagePath(code, lang) {
  const pack = packs[code];
  return lang === pack.meta.defaultLanguage ? `/${code}/` : `/${code}/${lang}/`;
}

/** Localized string with English fallback, matching the engine's resolution. */
const CORE_EN = parse(readFileSync(join(root, 'packages/core/data/strings/en.yaml'), 'utf8'));
function t(code, lang, path) {
  const parts = path.split('.');
  for (const source of [packs[code]?.strings?.[lang], CORE_EN]) {
    let cur = source;
    let ok = true;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object' || !(part in cur)) { ok = false; break; }
      cur = cur[part];
    }
    if (ok && typeof cur === 'string') return cur;
  }
  return path;
}

/**
 * Mark English text embedded in a page whose language is not English.
 *
 * WCAG 3.1.2 (Language of Parts) requires it, and this project cannot ship
 * a page that fails the standard it generates statements about. Automated
 * checkers do not catch untranslated interface text, so it has to be done
 * deliberately. Where a pack ships a real translation the localized string
 * is used instead and no marking is needed.
 */
function en(pageLang, text) {
  return pageLang === 'en' ? esc(text) : `<span lang="en">${esc(text)}</span>`;
}

/* ------------------------------------------------------------------ *
 * Page shell
 * ------------------------------------------------------------------ */

function layout({ title, description, lang = 'en', path, body, alternates = [], jsonLd, script }) {
  const hreflang = alternates
    .map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(absolute(a.path))}">`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(absolute(path))}">
${hreflang}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(absolute(path))}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${esc(url('/styles.css'))}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${esc(url('/'))}">accessibility-statement</a>
    <nav aria-label="Primary">
      <ul>
        <li><a href="${esc(url('/generator/'))}">Generator</a></li>
        <li><a href="${esc(url('/#countries'))}">Countries</a></li>
        <li><a href="${esc(url('/#cli'))}">CLI</a></li>
        <li><a href="${esc(REPO)}">Source</a></li>
      </ul>
    </nav>
  </div>
</header>
<main id="main">
<div class="wrap">
${body}
</div>
</main>
<footer class="site">
  <div class="wrap">
    <p>Free and open source under the MIT licence. No tracking, no accounts, no uploads.</p>
    <p><strong>Generated documents are drafts for human review and do not constitute legal advice.</strong> Have a responsible person review every artifact before publishing it.</p>
    <ul>
      <li><a href="${esc(REPO)}">Source code</a></li>
      <li><a href="${esc(REPO)}/blob/main/CONTRIBUTING.md">Contribute a country</a></li>
      <li><a href="https://www.npmjs.com/package/accessibility-statement">npm</a></li>
    </ul>
  </div>
</footer>
${script ? `<script type="module" src="${esc(url(script))}"></script>` : ''}
</body>
</html>
`;
}

function write(path, html) {
  const target = join(outDir, path, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

/* ------------------------------------------------------------------ *
 * Landing page
 * ------------------------------------------------------------------ */

const QUALITY_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

function countryRows() {
  return codes
    .filter((c) => c !== 'eu')
    .map((code) => {
      const m = packs[code].meta;
      return `<tr>
<th scope="row"><a href="${esc(url(pagePath(code, m.defaultLanguage)))}">${esc(m.name)}</a></th>
<td>${esc(QUALITY_LABEL[m.quality] ?? m.quality)}</td>
<td>${esc(m.languages.join(', '))}</td>
<td>${esc(m.enforcement.name.split('—')[0].trim())}</td>
</tr>`;
    })
    .join('\n');
}

const MISSING = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark',
  'Estonia', 'Finland', 'Greece', 'Hungary', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Sweden',
];

const landing = layout({
  title: 'Accessibility Statement Generator for the European Accessibility Act',
  description:
    'Free, open-source accessibility statement generator. Produce an EU accessibility statement in your country\'s format and language, a VPAT 2.5 / ACR conformance report and an Article 14 disproportionate-burden worksheet from your axe-core, pa11y or Lighthouse results. Runs in your browser — nothing is uploaded.',
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'accessibility-statement',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    description:
      'Open-source generator for EU accessibility statements, VPAT 2.5 / ACR conformance reports (OpenACR) and Article 14 disproportionate-burden worksheets, built from axe-core, pa11y or Lighthouse output.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: REPO,
    url: absolute('/'),
  },
  body: `
<h1>Accessibility Statement Generator</h1>
<p class="lede">Generate the accessibility statement the European Accessibility Act requires — in your member state's format and language — from accessibility test results you already have.</p>

<div class="cta-row">
  <a class="cta" href="${url('/generator/')}">Generate a statement</a>
  <a href="${REPO}">View the source</a>
</div>

<img class="hero-img" src="${url('/demo.svg')}" alt="A terminal session on the left runs three commands — init, render statement and check — and the document on the right is the resulting German accessibility statement, carrying a draft notice, a partial-compliance status, and WCAG criteria 1.1.1 and 1.4.3 listed against EN 301 549 clauses 9.1.1.1 and 9.1.4.3." width="918" height="486">

<div class="note">
  <p><strong>Nothing you enter leaves your browser.</strong> The generator runs entirely in this tab — there is no upload, no account, no email address and no tracking. That is a property of how it is built, not a promise: the engine makes no network calls at all.</p>
</div>

<h2>What it produces</h2>
<ul class="cards">
  <li>
    <h3>EU accessibility statement</h3>
    <p>In your member state's format and language, listing non-accessible content against EN 301 549 clauses, with the feedback route and the enforcement body a user actually complains to.</p>
  </li>
  <li>
    <h3>VPAT 2.5 / ACR</h3>
    <p>A conformance report in the machine-readable <a href="https://github.com/GSA/openacr">OpenACR</a> format, with HTML and Markdown views over the same document.</p>
  </li>
  <li>
    <h3>Disproportionate-burden worksheet</h3>
    <p>The Article 14 assessment: cost–benefit prompts against the Annex VI criteria, the micro-enterprise check, and the mandatory five-year reassessment date.</p>
  </li>
  <li>
    <h3>Traceability report</h3>
    <p>Every conclusion traced back to its evidence: criterion, EN 301 549 clause, source file, rule and selector. Conflicts are surfaced, never silently resolved.</p>
  </li>
</ul>

<h2 id="countries">Countries covered</h2>
<p>Each member state words its statement differently, in its own language, citing its own law and enforcement body. Every jurisdiction below has been checked against official government sources.</p>

<div class="table-scroll">
<table>
<caption>Jurisdiction packs currently shipping</caption>
<thead><tr><th scope="col">Country</th><th scope="col">Quality</th><th scope="col">Languages</th><th scope="col">Enforcement body</th></tr></thead>
<tbody>
${countryRows()}
</tbody>
</table>
</div>

<p>There is also a <a href="${url(pagePath('eu', 'en'))}">generic EU statement</a> based on the model in Commission Implementing Decision (EU) 2018/1523, for use where no national pack exists yet.</p>

<h3>Not yet covered</h3>
<p>${MISSING.map(esc).join(', ')}, plus Norway, Iceland and Liechtenstein.</p>
<p>A jurisdiction pack is <strong>data, not code</strong> — the national law, the enforcement body, and a translation. It takes about an evening and needs no knowledge of the engine. <a href="${REPO}/blob/main/CONTRIBUTING.md">Add your country</a>.</p>

<h2 id="cli">Put it in your pipeline</h2>
<p>The browser tool is for a one-off document. The command line is where this earns its keep: <code>check</code> compares conformance against a committed baseline and fails the build when a criterion regresses, so the statement stays true after the day you generated it.</p>

<pre><code>npx accessibility-statement init
npx accessibility-statement render statement --jurisdiction de --lang de --out statement.html
npx accessibility-statement check</code></pre>

<p>Reads axe-core, pa11y, pa11y-ci and Lighthouse JSON. Outputs HTML, Markdown, OpenACR, Word and tagged PDF. There is a first-party GitHub Action, recipes for other CI systems, and a pre-commit hook.</p>

<h2>What it is not</h2>
<p>It is not a scanner — <a href="https://github.com/dequelabs/axe-core">axe-core</a> owns that job and this tool consumes its output rather than competing with it. It is not an accessibility overlay, and it will not make an inaccessible site compliant. It does not provide legal advice.</p>
<p>What it does is turn the evidence you already have into the documents the regulation asks for, honestly — including saying plainly which criteria have not been evaluated.</p>
`,
});
write('/', landing);

/* ------------------------------------------------------------------ *
 * Country pages, one per pack per language
 * ------------------------------------------------------------------ */

for (const code of codes) {
  const pack = packs[code];
  const meta = pack.meta;

  const alternates = meta.languages.map((l) => ({ lang: l, path: pagePath(code, l) }));
  alternates.push({ lang: 'x-default', path: pagePath(code, meta.defaultLanguage) });

  for (const lang of meta.languages) {
    const statementTitle = t(code, lang, 'statement.title');
    const isEu = code === 'eu';

    const facts = [
      [esc(t(code, lang, 'statement.enforcementHeading')), esc(meta.enforcement.name)],
    ];
    if (meta.enforcement.address) facts.push([en(lang, 'Address'), esc(meta.enforcement.address)]);
    if (meta.enforcement.url)
      facts.push([en(lang, 'Website'), `<a href="${esc(meta.enforcement.url)}">${esc(meta.enforcement.url)}</a>`]);
    if (meta.enforcement.email)
      facts.push([en(lang, 'Email'), `<a href="mailto:${esc(meta.enforcement.email)}">${esc(meta.enforcement.email)}</a>`]);
    if (meta.enforcement.phone) facts.push([en(lang, 'Phone'), esc(meta.enforcement.phone)]);

    const conciliation = meta.enforcement.conciliation;

    const body = `
<h1>${esc(statementTitle)} — ${esc(meta.name)}</h1>
<p class="lede">${en(
      lang,
      isEu
        ? 'Generate a generic EU accessibility statement based on the model in Commission Implementing Decision (EU) 2018/1523, for use where no national pack exists yet.'
        : `Generate an accessibility statement for ${meta.name} in ${meta.languages.join(' and ')}, in the national format, from your accessibility test results.`
    )}</p>

<div class="cta-row">
  <a class="cta" href="${url('/generator/')}?country=${esc(code)}&amp;lang=${esc(lang)}">${en(lang, `Generate for ${meta.name}`)}</a>
</div>

<h2>${en(lang, 'The law')}</h2>
<dl class="facts">
  <dt>${en(lang, 'Transposing act')}</dt><dd>${esc(meta.legal.act)}</dd>
  ${meta.deadlines?.enforceableSince ? `<dt>${en(lang, 'Enforceable since')}</dt><dd>${esc(meta.deadlines.enforceableSince)}</dd>` : ''}
  ${
    (meta.legal.references ?? []).length > 0
      ? `<dt>${en(lang, 'Related instruments')}</dt><dd>${meta.legal.references.map(esc).join('<br>')}</dd>`
      : ''
  }
</dl>
${meta.deadlines?.notes ? `<p>${esc(meta.deadlines.notes)}</p>` : ''}

<h2>${esc(t(code, lang, 'statement.enforcementHeading'))}</h2>
<p>${esc(t(code, lang, 'statement.enforcementIntro'))}</p>
<dl class="facts">
${facts.map(([k, v]) => `  <dt>${k}</dt><dd>${v}</dd>`).join('\n')}
</dl>

${
  conciliation
    ? `<h3>${esc(t(code, lang, 'statement.conciliationIntro'))}</h3>
<dl class="facts">
  <dt>${en(lang, 'Body')}</dt><dd>${esc(conciliation.name)}</dd>
  ${conciliation.url ? `<dt>${en(lang, 'Website')}</dt><dd><a href="${esc(conciliation.url)}">${esc(conciliation.url)}</a></dd>` : ''}
</dl>
${conciliation.note ? `<p>${esc(conciliation.note)}</p>` : ''}`
    : ''
}

<h2>${en(lang, 'Sources')}</h2>
<p>${en(lang, `Every fact on this page is taken from the ${code.toUpperCase()} jurisdiction pack, which cites official sources and was last verified on ${meta.enforcement.verified ?? 'an unrecorded date'}.`)}</p>
<ul>
${meta.legal.sources.map((s) => `<li><a href="${esc(s)}">${esc(s)}</a></li>`).join('\n')}
</ul>

<h2>${en(lang, 'Generate it from the command line')}</h2>
<pre><code>npx accessibility-statement init
npx accessibility-statement render statement --jurisdiction ${esc(code)} --lang ${esc(lang)} --out statement.html</code></pre>

<div class="note"${lang === 'en' ? '' : ' lang="en"'}>
<p>This page describes what the tool produces and is not legal advice. Generated statements are drafts: have a responsible person review yours before publishing it. If you find an error in the ${esc(meta.name)} pack — a wrong enforcement body, a stale reference — <a href="${esc(REPO)}/issues/new/choose">please report it</a>; those reports matter more to this project than feature requests.</p>
</div>
`;

    write(pagePath(code, lang), layout({
      title: `${statementTitle} — ${meta.name} | Accessibility Statement Generator`,
      description: isEu
        ? 'Generate a generic EU accessibility statement based on the model in Commission Implementing Decision (EU) 2018/1523. Free, open source, runs in your browser.'
        : `Generate an accessibility statement for ${meta.name} under ${meta.legal.act}. Free and open source, in ${meta.languages.join(' and ')}, with the correct enforcement body. Runs in your browser.`,
      lang,
      path: pagePath(code, lang),
      alternates,
      body,
    }));
  }
}

/* ------------------------------------------------------------------ *
 * Generator page
 * ------------------------------------------------------------------ */

const countryOptions = codes
  .map((c) => `<option value="${esc(c)}"${c === 'eu' ? ' selected' : ''}>${esc(packs[c].meta.name)}</option>`)
  .join('\n');

write('/generator/', layout({
  title: 'Free accessibility statement generator — runs in your browser',
  description:
    'Paste your axe-core, pa11y or Lighthouse results and get an EU accessibility statement, VPAT/ACR or disproportionate-burden worksheet. No upload, no account, no email address — it runs entirely in your browser.',
  path: '/generator/',
  script: '/app.js',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Generate an EU accessibility statement',
    step: [
      { '@type': 'HowToStep', name: 'Run an accessibility test', text: 'Produce a JSON report with axe-core, pa11y or Lighthouse.' },
      { '@type': 'HowToStep', name: 'Paste the report', text: 'Paste or upload the JSON file. It stays in your browser.' },
      { '@type': 'HowToStep', name: 'Choose your country', text: 'Pick the member state and language for the statement format.' },
      { '@type': 'HowToStep', name: 'Download the statement', text: 'Review the draft, then have a responsible person sign it off.' },
    ],
  },
  body: `
<h1>Generate an accessibility statement</h1>
<p class="lede">Paste the results of an accessibility test and get the document the European Accessibility Act asks for.</p>

<div class="note">
  <p><strong>Your data stays in this tab.</strong> There is no server to send it to — the generator is the same engine the command-line tool uses, compiled to run in your browser. No upload, no account, no email address, no analytics.</p>
</div>

<div id="gen-nojs" class="note" hidden>
  <p><strong>The generator needs JavaScript</strong>, because it runs the whole engine locally rather than on a server. If you would rather not enable it, the command-line tool does exactly the same thing:</p>
  <pre><code>npx accessibility-statement init
npx accessibility-statement render statement --jurisdiction de --lang de --out statement.html</code></pre>
</div>

<div id="gen-error" role="alert" tabindex="-1" hidden></div>

<form id="gen-form" novalidate>
  <div class="field">
    <label for="evidence">Accessibility test results (JSON)</label>
    <p class="hint" id="evidence-hint">Output from axe-core, pa11y, pa11y-ci or Lighthouse. Paste it here, or choose a file below — either way it stays on your machine.</p>
    <textarea id="evidence" name="evidence" aria-describedby="evidence-hint" spellcheck="false"></textarea>
  </div>

  <div class="field">
    <label for="evidence-file">…or choose a file</label>
    <input type="file" id="evidence-file" accept=".json,application/json">
  </div>

  <div class="row">
    <div class="field">
      <label for="country">Country</label>
      <select id="country" name="country">
${countryOptions}
      </select>
    </div>
    <div class="field">
      <label for="lang">Language</label>
      <select id="lang" name="lang"></select>
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label for="org">Organisation name</label>
      <input type="text" id="org" name="org" value="Example Organisation" autocomplete="organization">
    </div>
    <div class="field">
      <label for="product">Website or service name</label>
      <input type="text" id="product" name="product" value="Example Website">
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label for="email">Accessibility contact email</label>
      <input type="email" id="email" name="email" value="accessibility@example.org" autocomplete="email">
    </div>
    <div class="field">
      <label for="date">Preparation date</label>
      <input type="text" id="date" name="date" value="2026-08-03" inputmode="numeric" pattern="\\d{4}-\\d{2}-\\d{2}" aria-describedby="date-hint">
      <p class="hint" id="date-hint">YYYY-MM-DD. Dates are explicit so the same inputs always produce the same document.</p>
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label for="kind">Document</label>
      <select id="kind" name="kind">
        <option value="statement">Accessibility statement</option>
        <option value="acr">VPAT 2.5 / ACR conformance report</option>
        <option value="burden">Disproportionate-burden worksheet</option>
        <option value="trace">Traceability report</option>
      </select>
    </div>
    <div class="field">
      <label for="format">Format</label>
      <select id="format" name="format">
        <option value="html">HTML</option>
        <option value="md">Markdown</option>
        <option value="openacr">OpenACR (YAML)</option>
        <option value="pdf">PDF (tagged)</option>
      </select>
      <p class="hint">Word (.docx) is available from the command-line tool.</p>
    </div>
  </div>

  <p><button type="submit">Generate document</button></p>
</form>

<p id="gen-status" role="status" aria-live="polite" class="visually-hidden"></p>

<div id="gen-output-wrap" tabindex="-1" hidden>
  <h2>Your draft</h2>
  <p class="summary" id="gen-summary"></p>
  <p><a class="cta" id="gen-download" href="#">Download</a></p>
  <iframe id="gen-preview" title="Preview of the generated document" hidden></iframe>
  <pre id="gen-output" hidden></pre>
  <div class="note">
    <p><strong>This is a draft.</strong> It carries a visible draft notice until a named person reviews and signs it off. It does not constitute legal advice, and it cannot know whether your evidence is complete — criteria that automated testing cannot judge are reported as not evaluated, which is honest and is what the regulation expects you to address.</p>
    <p>To fill in the manual checklist, keep the document in version control and run the check in CI, use the <a href="${url('/#cli')}">command-line tool</a>.</p>
  </div>
</div>
`,
}));

/* ------------------------------------------------------------------ *
 * Assets, sitemap, robots, 404
 * ------------------------------------------------------------------ */

mkdirSync(outDir, { recursive: true });
cpSync(join(SITE, 'src/styles.css'), join(outDir, 'styles.css'));
cpSync(join(root, 'docs/assets/demo.svg'), join(outDir, 'demo.svg'));

// Bundle the engine plus the UI. The packs are injected as a virtual module
// so the site is built from the same data the CLI ships.
const packsJson = JSON.stringify(
  Object.fromEntries(
    codes.map((c) => [
      c,
      {
        meta: packs[c].meta,
        strings: packs[c].strings,
        templates: packs[c].templates,
        usesFallbackTemplates: packs[c].usesFallbackTemplates,
      },
    ])
  )
);
const virtualPacks = join(SITE, 'src', '.packs.generated.js');
writeFileSync(virtualPacks, `export default ${packsJson};\n`);

const esbuild = join(root, 'node_modules/.bin/esbuild');
execFileSync(
  esbuild,
  [
    join(SITE, 'src/entry.js'),
    '--bundle',
    '--format=esm',
    '--platform=browser',
    '--target=es2020',
    '--minify',
    `--alias:node:fs=${join(SITE, 'src/stubs/fs.js')}`,
    `--alias:node:path=${join(SITE, 'src/stubs/path.js')}`,
    `--alias:node:zlib=${join(SITE, 'src/stubs/zlib.js')}`,
    `--alias:virtual:packs=${virtualPacks}`,
    `--outfile=${join(outDir, 'engine.js')}`,
    '--log-level=warning',
  ],
  { stdio: 'inherit' }
);
rmSync(virtualPacks, { force: true });

// app.js loads the engine first, then wires up the form.
const app = readFileSync(join(SITE, 'src/app.js'), 'utf8');
writeFileSync(
  join(outDir, 'app.js'),
  `import './engine.js';\n${app}\n`
);

const pages = ['/', '/generator/'];
for (const code of codes) {
  for (const lang of packs[code].meta.languages) pages.push(pagePath(code, lang));
}

writeFileSync(
  join(outDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((p) => `  <url><loc>${absolute(p)}</loc><changefreq>monthly</changefreq></url>`)
  .join('\n')}
</urlset>
`
);

writeFileSync(
  join(outDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}/sitemap.xml\n`
);

writeFileSync(
  join(outDir, '404.html'),
  layout({
    title: 'Page not found',
    description: 'That page does not exist.',
    path: '/404.html',
    body: `<h1>Page not found</h1>
<p>That page does not exist. Try the <a href="${url('/')}">home page</a> or the <a href="${url('/generator/')}">generator</a>.</p>`,
  })
);

// GitHub Pages otherwise runs the output through Jekyll and drops files
// whose names begin with an underscore.
writeFileSync(join(outDir, '.nojekyll'), '');

console.log(`built ${pages.length} pages into ${outDir}`);
for (const p of pages) console.log(`  ${p}`);
