// Creates the launch backlog of scoped, labelled good-first-issues
// (DX-3, REQ-PACK-5). Every issue carries the exact command that starts it.
//
//   node scripts/seed-issues.mjs --dry-run     # print what would be created
//   node scripts/seed-issues.mjs               # create them (needs gh auth)
//
// Research basis: ~27% of newcomers pick up a labelled issue, so reaching
// 20 contributors needs on the order of 75 scoped tasks. Packs dominate the
// list because they are self-contained; readers, translations and CI
// recipes make up the rest.
import { spawnSync } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');

const COUNTRIES = [
  ['at', 'Austria', 'de'],
  ['be', 'Belgium', 'nl, fr, de'],
  ['bg', 'Bulgaria', 'bg'],
  ['hr', 'Croatia', 'hr'],
  ['cy', 'Cyprus', 'el'],
  ['cz', 'Czechia', 'cs'],
  ['dk', 'Denmark', 'da'],
  ['ee', 'Estonia', 'et'],
  ['fi', 'Finland', 'fi, sv'],
  ['gr', 'Greece', 'el'],
  ['hu', 'Hungary', 'hu'],
  ['lv', 'Latvia', 'lv'],
  ['lt', 'Lithuania', 'lt'],
  ['lu', 'Luxembourg', 'fr, de, lb'],
  ['mt', 'Malta', 'mt, en'],
  ['nl', 'Netherlands', 'nl'],
  ['pl', 'Poland', 'pl'],
  ['pt', 'Portugal', 'pt'],
  ['ro', 'Romania', 'ro'],
  ['sk', 'Slovakia', 'sk'],
  ['si', 'Slovenia', 'sl'],
  ['se', 'Sweden', 'sv'],
  ['no', 'Norway (EEA)', 'nb, nn'],
  ['is', 'Iceland (EEA)', 'is'],
  ['li', 'Liechtenstein (EEA)', 'de'],
  ['gb', 'United Kingdom', 'en'],
];

const READERS = [
  ['Playwright ariaSnapshot', 'playwright', 'https://playwright.dev/docs/aria-snapshots'],
  ['WAVE', 'wave', 'https://wave.webaim.org/api/'],
  ['IBM Equal Access Accessibility Checker', 'equal-access', 'https://github.com/IBMa/equal-access'],
  ['Accessibility Insights', 'accessibility-insights', 'https://accessibilityinsights.io/'],
  ['Siteimprove', 'siteimprove', 'https://www.siteimprove.com/'],
  ['axe DevTools JSON export', 'axe-devtools', 'https://docs.deque.com/devtools-html/'],
  ['HTML_CodeSniffer standalone', 'htmlcs', 'https://squizlabs.github.io/HTML_CodeSniffer/'],
];

const RECIPES = [
  ['GitLab CI', 'gitlab-ci'],
  ['CircleCI', 'circleci'],
  ['Jenkins', 'jenkins'],
  ['Azure Pipelines', 'azure-pipelines'],
  ['Woodpecker CI', 'woodpecker'],
  ['Bitbucket Pipelines', 'bitbucket'],
];

const UI_LANGUAGES = [
  ['German', 'de'],
  ['French', 'fr'],
  ['Spanish', 'es'],
  ['Italian', 'it'],
  ['Dutch', 'nl'],
  ['Polish', 'pl'],
  ['Portuguese', 'pt'],
  ['Swedish', 'sv'],
];

const CRITERIA_TRANSLATIONS = [
  ['French', 'fr'],
  ['Spanish', 'es'],
  ['Italian', 'it'],
  ['Irish', 'ga'],
];

const issues = [];

for (const [code, name, languages] of COUNTRIES) {
  issues.push({
    title: `pack: add the ${name} jurisdiction pack (${code})`,
    labels: ['pack', 'good first issue', 'help wanted'],
    body: `Add the jurisdiction pack for **${name}**, so \`accessibility-statement render statement --jurisdiction ${code}\` produces a statement in the national format and language.

**No knowledge of the engine is required.** A pack is data: the national law, the enforcement body, and a translation. Roughly one evening.

### Start here

\`\`\`bash
npx accessibility-statement contrib scaffold-pack --country ${code}
\`\`\`

That writes the whole skeleton, including a \`TODO.md\` checklist and a test fixture. Then:

1. Fill in the TODOs in \`pack.yaml\` — the national act transposing Directive (EU) 2019/882, and the market surveillance authority a user would complain to. Every claim needs an official source URL.
2. Translate \`strings.<lang>.yaml\`. Expected language(s): **${languages}**. One is enough for Bronze.
3. \`npx accessibility-statement validate-pack packages/packs/packs/${code}\` — it lists exactly what remains.
4. \`npm run update-snapshots -w @accessibility-statement/packs -- ${code}\` and commit.

### Definition of done

- [ ] 🥉 Bronze: statement renders in one language, \`pack.yaml\` complete with sources
- [ ] Snapshots committed
- [ ] You are listed in \`maintainers\` and CODEOWNERS

Silver (all official languages + verified enforcement body) is welcome but not required to merge.

Comment here to claim it. Questions in the pull request are welcome — a maintainer replies within 24 hours.`,
  });
}

for (const [name, slug, docs] of READERS) {
  issues.push({
    title: `reader: support ${name} reports`,
    labels: ['reader', 'good first issue', 'help wanted'],
    body: `Let accessibility-statement read **${name}** output as evidence, so teams already using it do not have to add another scanner.

A reader is one self-contained file implementing \`detect()\` and \`read()\`. It never touches conformance computation or rendering.

### Start here

\`\`\`bash
npx accessibility-statement contrib scaffold-reader --name ${slug}
\`\`\`

You get the module and its test, both commented with what to fill in.

Tool documentation: ${docs}

### Definition of done

- [ ] A **real** report from the tool saved as the fixture (real output catches shapes hand-written JSON never will)
- [ ] \`detect()\` is strict — it must never claim another tool's file
- [ ] Findings map to WCAG criteria; rules that map to none leave \`criteria: []\` rather than guessing
- [ ] Registered in \`packages/core/src/evidence/registry.ts\` and listed in \`docs/evidence-formats.md\`
- [ ] Tests pass, including the "rejects other formats" case`,
  });
}

for (const [name, slug] of RECIPES) {
  issues.push({
    title: `docs: ${name} recipe for accessibility-statement check`,
    labels: ['docs', 'good first issue', 'help wanted'],
    body: `Document how to run \`accessibility-statement check\` on **${name}**, so the regression gate is usable outside GitHub Actions.

accessibility-statement is a plain CLI with no network access, so this is a docs contribution: a working, tested configuration plus a short explanation.

### Start here

Copy \`docs/recipes/github-actions.md\` as the shape to follow, and add \`docs/recipes/${slug}.md\`.

### Definition of done

- [ ] A complete, copy-pasteable configuration
- [ ] Shows caching the baseline (\`a11y-statement.lock.json\`) and publishing the rendered artifacts
- [ ] You actually ran it somewhere and it worked (say so in the pull request)
- [ ] Linked from \`docs/ci.md\``,
  });
}

for (const [name, code] of UI_LANGUAGES) {
  issues.push({
    title: `i18n: translate the accessibility-statement interface strings into ${name} (${code})`,
    labels: ['i18n', 'good first issue', 'help wanted'],
    body: `Translate the shared artifact and interface strings into **${name}**, so packs in that language inherit correct wording instead of falling back to English.

Pure data: copy \`packages/core/data/strings/en.yaml\` to \`${code}.yaml\` and translate the values. Keys stay as they are; any key you leave out falls back to English, so partial work is still mergeable.

### Definition of done

- [ ] \`packages/core/data/strings/${code}.yaml\` added
- [ ] You speak this language (see the AI-assistance policy in CONTRIBUTING.md)
- [ ] \`npm test\` passes
- [ ] Terminology matches what the relevant national authority uses, where one exists`,
  });
}

for (const [name, code] of CRITERIA_TRANSLATIONS) {
  issues.push({
    title: `i18n: translate WCAG criterion names into ${name} (${code})`,
    labels: ['i18n', 'good first issue', 'help wanted'],
    body: `Statements currently print WCAG success-criterion names in English inside otherwise fully translated ${name} documents.

Add a \`criteria:\` block to the ${code} strings file mapping criterion ids to their ${name} names. Untranslated criteria fall back to the English W3C name, so a partial list is valid and mergeable.

Worked example: [\`packages/packs/packs/de/strings.de.yaml\`](../blob/main/packages/packs/packs/de/strings.de.yaml).

Where possible use the W3C's own authorised translation of WCAG for this language rather than translating the names yourself.

### Definition of done

- [ ] \`criteria:\` block added for the A and AA criteria
- [ ] Snapshots updated (\`npm run update-snapshots -w @accessibility-statement/packs\`)
- [ ] You speak this language`,
  });
}

// A few core tasks, deliberately outnumbered by self-contained work.
issues.push(
  {
    title: 'core: PDF/UA conformance audit of the generated PDF',
    labels: ['core', 'help wanted', 'accessibility'],
    body: `The PDF renderer emits a tagged PDF (structure tree, marked content,
\`/Lang\`, \`DisplayDocTitle\`) and poppler reports \`Tagged: yes\`. What has not
been done is a formal PDF/UA conformance check with a real validator such as
veraPDF or PAC.

Likely gaps to look for: an XMP metadata stream declaring PDF/UA-1, a
\`/StructParents\` entry on every annotation, explicit \`/Alt\` text where
graphics appear, and correct \`/L\`/\`/LI\` nesting for bullet lists (they are
currently tagged \`LBody\` without an enclosing \`L\`).

Run a validator, report what it says, and fix what it finds — each is a small,
well-scoped change in \`packages/core/src/render/pdf.ts\`.`,
  },
  {
    title: 'core: embed a Unicode font so packs beyond Latin-1 render in PDF',
    labels: ['core', 'help wanted', 'i18n'],
    body: `The PDF writer uses the base-14 Helvetica with WinAnsiEncoding, which
covers Latin-1 and therefore every launch pack. Greek (el), Bulgarian (bg) and
any future Cyrillic or Greek pack will render \`?\` for characters outside that
range — see \`pdfString\` in \`packages/core/src/render/pdf-font.ts\`.

Fixing this means embedding a subsetted TrueType font with a \`/ToUnicode\` CMap.
The constraint that makes it interesting: no new runtime dependency (the budget
is five, currently one), deterministic output, and the font file has to be
licence-compatible and small enough to ship. Discuss the approach in this issue
before writing code.

This blocks Bronze packs for Greece, Bulgaria and Cyprus from having usable PDF
output, so it matters more than its obscurity suggests.`,
  },
  {
    title: 'data: EN 301 549 v4.1.1 mapping when it publishes (FR-MAP-4)',
    labels: ['data', 'help wanted', 'standards'],
    body: `EN 301 549 v4.1.1, incorporating WCAG 2.2, is expected to publish in 2026.

By design this is a **data-only** change: add \`packages/core/data/standards/en301549-4.1.1.yaml\` alongside the existing file. Do not edit the shipped v3.2.1 data — projects pin a version and their artifacts must not change under them.

This issue is a good one to pair on when the standard lands.`,
  },
  {
    title: 'core: non-web EN 301 549 clauses (chapters 5–8, 11) (FR-MAP-5)',
    labels: ['core', 'help wanted', 'standards'],
    body: `The schema already reserves clause space for the non-web chapters (\`reservedChapters\`), so extending coverage to hardware, software and documentation clauses is additive rather than breaking.

Start with chapter 11 (software), which has the clearest overlap with existing WCAG mappings. Discuss scope in the issue before implementing.`,
  }
);

console.log(`${issues.length} issues to seed:\n`);
for (const issue of issues) {
  console.log(`  [${issue.labels.join(', ')}] ${issue.title}`);
}

if (dryRun) {
  console.log('\n--dry-run: nothing created.');
  process.exit(0);
}

let created = 0;
for (const issue of issues) {
  const args = ['issue', 'create', '--title', issue.title, '--body', issue.body];
  for (const label of issue.labels) args.push('--label', label);
  const result = spawnSync('gh', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`Failed to create: ${issue.title}`);
    process.exit(1);
  }
  created++;
}
console.log(`\nCreated ${created} issues.`);
