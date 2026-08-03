import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { A11yStatementError, DOCS_BASE } from '@accessibility-statement/core';
import { flagBool, flagString, type ParsedArgs } from '../args.js';
import { resolvePacksDir } from '../resolve.js';

/**
 * `accessibility-statement contrib scaffold-pack` / `scaffold-reader` (FR-CLI-4, REQ-PACK-3).
 *
 * The Home Assistant scaffolding lesson: convert mentoring into automation.
 * The output is a complete, schema-valid, snapshot-testable skeleton whose
 * only remaining work is translation and enforcement-body research — both
 * things the contributor knows and the maintainer does not.
 */
export function contribCommand(args: ParsedArgs): number {
  const sub = args.positionals[0];
  switch (sub) {
    case 'scaffold-pack':
      return scaffoldPack(args);
    case 'scaffold-reader':
      return scaffoldReader(args);
    default:
      throw new A11yStatementError({
        what: sub ? `Unknown contrib subcommand "${sub}".` : 'contrib needs a subcommand.',
        fix: 'Use: accessibility-statement contrib scaffold-pack --country xx | accessibility-statement contrib scaffold-reader --name toolname',
        docs: `${DOCS_BASE}/../CONTRIBUTING.md`,
      });
  }
}

function scaffoldPack(args: ParsedArgs): number {
  const country = (flagString(args.flags, 'country') ?? '').toLowerCase();
  if (!/^[a-z]{2}$/.test(country)) {
    throw new A11yStatementError({
      what: 'scaffold-pack needs a two-letter country code.',
      fix: 'Example: accessibility-statement contrib scaffold-pack --country pt',
      docs: `${DOCS_BASE}/packs.md`,
    });
  }
  const lang = (flagString(args.flags, 'lang') ?? country).toLowerCase();
  const packsDir = resolvePacksDir(flagString(args.flags, 'packs-dir'));
  const target = resolve(flagString(args.flags, 'out') ?? join(packsDir, country));

  if (existsSync(target) && !flagBool(args.flags, 'force')) {
    throw new A11yStatementError({
      what: `${target} already exists.`,
      why: 'A pack for this country may already be in progress.',
      fix: 'Check the support matrix in the README; pass --force to overwrite, or --out <dir> to scaffold elsewhere.',
      docs: `${DOCS_BASE}/packs.md`,
    });
  }

  mkdirSync(join(target, 'fixture'), { recursive: true });
  writeFileSync(join(target, 'pack.yaml'), packYamlTemplate(country, lang));
  writeFileSync(join(target, `strings.${lang}.yaml`), stringsTemplate(lang));
  writeFileSync(join(target, 'fixture', 'config.yaml'), fixtureConfigTemplate(country, lang));

  const sampleEvidence = join(packsDir, 'eu', 'fixture', 'axe.json');
  if (existsSync(sampleEvidence)) {
    copyFileSync(sampleEvidence, join(target, 'fixture', 'axe.json'));
  }
  writeFileSync(join(target, 'TODO.md'), packTodoTemplate(country, lang, target));

  const created = [
    join(target, 'pack.yaml'),
    join(target, `strings.${lang}.yaml`),
    join(target, 'fixture', 'config.yaml'),
    join(target, 'fixture', 'axe.json'),
    join(target, 'TODO.md'),
  ];

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(JSON.stringify({ country, lang, dir: target, created }, null, 2) + '\n');
    return 0;
  }

  process.stdout.write(
    `Scaffolded a jurisdiction pack for "${country}" in ${target}\n\n` +
      created.map((f) => `  ${f}\n`).join('') +
      `\nThree steps to a Bronze pack (about one evening, no core knowledge needed):\n` +
      `  1. Fill the TODOs in pack.yaml — the act that transposes the EAA in your\n` +
      `     country, and the enforcement body a user would actually complain to.\n` +
      `  2. Translate strings.${lang}.yaml. Only the phrasing matters; the keys stay.\n` +
      `  3. Generate and eyeball your statement, then commit the snapshots:\n` +
      `       accessibility-statement validate-pack ${target}\n` +
      `       npm run update-snapshots -w @accessibility-statement/packs -- ${country}\n\n` +
      `Read TODO.md in the new directory for the full checklist.\n`
  );
  return 0;
}

function packYamlTemplate(country: string, lang: string): string {
  return `# TODO: jurisdiction pack for ${country.toUpperCase()}.
# Every TODO below must be replaced before this pack can be merged.
# Validate as you go with:  accessibility-statement validate-pack packages/packs/packs/${country}
schemaVersion: 1
country: ${country}
# TODO: the country's name, in English and (optionally) its own language,
# e.g. "Portugal" or "Germany (Deutschland)".
name: TODO
# TODO: every official language you ship strings for. Bronze = one language.
languages: [${lang}]
defaultLanguage: ${lang}
legal:
  # TODO: the national act transposing Directive (EU) 2019/882.
  act: TODO
  references:
    # TODO: other relevant national instruments (optional but valuable).
    - Directive (EU) 2019/882 (European Accessibility Act)
    - EN 301 549
  sources:
    # TODO: at least one https:// source backing the claims above.
    # Official government or legislature domains only, please.
    - https://TODO
enforcement:
  # TODO: the body a user complains to when an accessibility request is
  # ignored — usually the market surveillance authority for services.
  name: TODO
  url: https://TODO
  # address: ""
  # email: ""
  # phone: ""
  # TODO (Silver): date you verified the enforcement details, YYYY-MM-DD.
  # verified: "2026-01-01"
deadlines:
  enforceableSince: "2025-06-28"
  # notes: national penalties, transition arrangements, sector specifics
# Bronze: statement template + one language.
# Silver: + all official languages + verified enforcement body (url + verified).
# Gold:   + DOCX template + review by a second native speaker.
quality: bronze
maintainers:
  # TODO: your GitHub handle — this gives you review standing on this pack
  # via CODEOWNERS (REQ-PACK-6).
  - TODO
`;
}

function stringsTemplate(lang: string): string {
  return `# TODO: translate the strings below into "${lang}".
#
# Rules of thumb:
#   - Keys never change; only the text after the colon does.
#   - Delete any key you want to leave in English — unset keys fall back to
#     the core English strings, so a partial file is valid.
#   - Prefer the wording your national authority uses in its own model
#     statement over a literal translation of the English.
#   - Keep the draft watermark unambiguous: it is a liability control.
common:
  draftWatermark: "TODO: DRAFT — for human review. Generated by accessibility-statement; this document does not constitute legal advice and must be reviewed by a responsible person before publication."
  reviewedBy: "TODO: Reviewed by"
  reviewedOn: "TODO: Reviewed on"
  generatedBy: "TODO: Generated with accessibility-statement from recorded test evidence."
  status:
    pass: "TODO: Conforms"
    fail: "TODO: Does not conform"
    partial: "TODO: Partially conforms"
    not-applicable: "TODO: Not applicable"
    not-evaluated: "TODO: Not evaluated"
  compliance:
    full: "TODO: fully compliant"
    partial: "TODO: partially compliant"
    non-compliant: "TODO: not compliant"
statement:
  title: "TODO: Accessibility statement"
  forProduct: "TODO: This accessibility statement applies to"
  complianceSentence:
    full: "TODO: is fully compliant with the accessibility requirements of EN 301 549 (WCAG, level AA)."
    partial: "TODO: is partially compliant with the accessibility requirements of EN 301 549 (WCAG, level AA), due to the non-compliances and exemptions listed below."
    nonCompliant: "TODO: is not compliant with the accessibility requirements of EN 301 549 (WCAG, level AA). The non-compliances are listed below."
  complianceStatusHeading: "TODO: Compliance status"
  nonAccessibleHeading: "TODO: Non-accessible content"
  nonAccessibleIntro: "TODO: The content listed below is non-accessible for the following reasons:"
  criterionLabel: "TODO: WCAG criterion"
  clauseLabel: "TODO: EN 301 549 clause"
  preparationHeading: "TODO: Preparation of this accessibility statement"
  preparedOn: "TODO: This statement was prepared on"
  method: "TODO: Evaluation method"
  lastReviewed: "TODO: The statement was last reviewed on"
  feedbackHeading: "TODO: Feedback and contact information"
  feedbackIntro: "TODO: Should you notice shortcomings of digital accessibility, or should you need information in an accessible format, please contact us:"
  enforcementHeading: "TODO: Enforcement procedure"
  enforcementIntro: "TODO: If you are not satisfied with the answers to your enquiry, you can contact the responsible enforcement body:"
  notEvaluatedHeading: "TODO: Content not yet evaluated"
  notEvaluatedIntro: "TODO: The following requirements have not yet been evaluated:"
  burdenHeading: "TODO: Disproportionate burden"
  burdenIntro: "TODO: The following content is exempted under a disproportionate-burden assessment (Article 14, Directive (EU) 2019/882):"
`;
}

function fixtureConfigTemplate(country: string, lang: string): string {
  return `# Fixture used by the snapshot tests (QA-1). It is deliberately fake:
# it exists so your pack renders a full statement with failures, exemptions
# and contact details, without depending on any real project.
# Dates are fixed so output stays byte-identical (FR-ART-5).
organisation:
  name: Example Organisation
  email: accessibility@example.${country}
  website: https://example.${country}
  employees: 42
  turnoverEUR: 5000000
product:
  name: Example Online Shop
  scope: The statement covers the public online shop.
  urls:
    - https://example.${country}/
jurisdiction: ${country}
languages: [${lang}]
evidence:
  paths:
    - axe.json
dates:
  preparation: "2026-07-01"
evaluationMethod: Self-assessment with automated testing (axe-core) and a manual checklist.
feedback:
  email: accessibility@example.${country}
`;
}

function packTodoTemplate(country: string, lang: string, target: string): string {
  return `# Finishing the ${country.toUpperCase()} pack

Delete this file before opening your pull request.

## What you are building

A jurisdiction pack is **data**: it tells accessibility-statement how an accessibility
statement is worded in your country, in your language, and who enforces it.
You do not need to read or understand the engine — the schema and the
snapshot tests are the reviewer (REQ-PACK-2).

## Checklist for Bronze (one evening)

- [ ] \`pack.yaml\`: replace every \`TODO\`.
      - \`legal.act\`: the national law transposing Directive (EU) 2019/882.
      - \`legal.sources\`: official URLs backing what you wrote. This is how
        a reviewer who does not speak your language verifies the pack.
      - \`enforcement.name\` / \`.url\`: the body a user actually complains to.
- [ ] \`strings.${lang}.yaml\`: translate. Use your national authority's own
      wording where it exists; delete keys you want left in English.
- [ ] Validate: \`accessibility-statement validate-pack ${target}\`
- [ ] Render and read it end to end — you are the first reader who can
      judge whether it sounds like a real statement in your language:
      \`accessibility-statement render statement --config ${target}/fixture/config.yaml \\
          --jurisdiction ${country} --lang ${lang}\`
- [ ] Commit snapshots: \`npm run update-snapshots -w @accessibility-statement/packs -- ${country}\`
- [ ] Add yourself to \`maintainers\` in pack.yaml and to CODEOWNERS.
- [ ] Open the PR. CI posts the rendered statement as an artifact, so
      reviewers read your statement, not a diff (DX-4).

## Going to Silver

- [ ] Ship every official language of the state (one \`strings.<lang>.yaml\`
      per language, all listed in \`languages\`).
- [ ] Verify the enforcement body against an official source and set
      \`enforcement.verified\` to the date you checked.
- [ ] Set \`quality: silver\`.

## Going to Gold

- [ ] A DOCX template for legal teams.
- [ ] A second native speaker reviews the translation and is added to
      \`maintainers\`.
- [ ] Set \`quality: gold\`.

## If a template does not fit your national format

Most countries derive their statement from the same EU model, so the shared
template plus your strings is usually enough. If your national format
genuinely differs (extra mandatory section, different ordering), copy
\`packs/eu/templates/statement.html.mustache\` into \`${country}/templates/\`
and edit it there. Templates are logic-less on purpose (NFR-9): sections and
variables only, no expressions.

Questions are welcome in the pull request — a maintainer replies within
24 hours (MAINTAINERS.md).
`;
}

function scaffoldReader(args: ParsedArgs): number {
  const name = (flagString(args.flags, 'name') ?? '').toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new A11yStatementError({
      what: 'scaffold-reader needs a tool name.',
      fix: 'Example: accessibility-statement contrib scaffold-reader --name wave',
      docs: `${DOCS_BASE}/writing-a-reader.md`,
    });
  }
  const outDir = resolve(flagString(args.flags, 'out') ?? '.');
  const srcPath = join(outDir, `${name}.ts`);
  const testPath = join(outDir, `${name}.reader.test.ts`);
  if ((existsSync(srcPath) || existsSync(testPath)) && !flagBool(args.flags, 'force')) {
    throw new A11yStatementError({
      what: `A reader named "${name}" already exists in ${outDir}.`,
      fix: 'Pass --force to overwrite, or --out <dir> to scaffold elsewhere.',
      docs: `${DOCS_BASE}/writing-a-reader.md`,
    });
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(srcPath, readerTemplate(name));
  writeFileSync(testPath, readerTestTemplate(name));

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(JSON.stringify({ name, created: [srcPath, testPath] }, null, 2) + '\n');
    return 0;
  }
  process.stdout.write(
    `Scaffolded an evidence reader for "${name}"\n\n  ${srcPath}\n  ${testPath}\n\n` +
      `Next:\n` +
      `  1. Save a real ${name} report as a fixture next to the test.\n` +
      `  2. Fill in detect() — it must be specific enough never to claim\n` +
      `     another tool's format; accessibility-statement refuses to guess (FR-ING-5).\n` +
      `  3. Fill in read(), mapping each finding to WCAG criteria.\n` +
      `  4. Register it in packages/core/src/evidence/registry.ts and list\n` +
      `     the format in docs/evidence-formats.md.\n`
  );
  return 0;
}

function readerTemplate(name: string): string {
  const symbol = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return `import type { EvidenceFile, Finding } from '../../types.js';
import type { EvidenceReader } from '../registry.js';

/**
 * Evidence reader for ${name}.
 *
 * A reader is a self-contained contributor unit (FR-ING-6): it turns one
 * tool's report into canonical Findings. It never touches conformance
 * computation, rendering or packs.
 */

// TODO: describe the shape of a ${name} report, enough to detect it.
interface ${symbol}Report {
  // e.g. version: string;
  // e.g. issues: Array<{ ruleId: string; level: string; selector: string }>;
}

export const ${symbol}Reader: EvidenceReader = {
  name: '${name}',

  // TODO: what a user would call this format, shown in error messages
  // when accessibility-statement cannot recognise a file.
  formatLabel: '${name} JSON report (TODO: which command produces it)',

  detect(parsed: unknown): boolean {
    // TODO: return true only for ${name} reports. Check for a field that
    // no other supported tool emits — a wrong guess silently mis-parses
    // someone's compliance evidence, so be strict.
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      false // TODO
    );
  },

  read(parsed: unknown, path: string): EvidenceFile {
    const report = parsed as ${symbol}Report;
    const findings: Finding[] = [];

    // TODO: for each issue in the report, push a Finding:
    //
    //   findings.push({
    //     ruleId: issue.ruleId,
    //     source: '${name}',
    //     outcome: 'fail',        // 'fail' | 'pass' | 'incomplete' | 'inapplicable'
    //     criteria: ['1.1.1'],    // WCAG criteria this rule maps to
    //     url: issue.url,
    //     selectors: [issue.selector],
    //     message: issue.message,
    //   });
    //
    // If ${name} reports WCAG criteria directly, use them. If it uses its
    // own rule ids, add a mapping table at
    // packages/core/data/rules/${name}.yaml and read it the way
    // mapping/rules.ts does for axe — mappings are data, never code
    // (FR-MAP-1). Rules that map to no criterion are fine: leave
    // \`criteria: []\` and they surface in the trace as unmapped rather
    // than being dropped.
    void report;

    return {
      path,
      reader: '${name}',
      tool: '${name}',
      // toolVersion: report.version,
      urls: [], // TODO: every URL this report covers, sorted
      findings,
    };
  },
};
`;
}

function readerTestTemplate(name: string): string {
  const symbol = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ${symbol}Reader } from '../src/evidence/readers/${name}.js';

// TODO: save a real, small ${name} report next to this test as
// ${name}.fixture.json. Real output beats hand-written JSON — the point of
// the fixture corpus (QA-3) is that it catches the shapes tools actually
// emit, including the awkward ones.
const fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, '${name}.fixture.json'), 'utf8')
);

test('${name} reader detects its own format', () => {
  assert.equal(${symbol}Reader.detect(fixture, '${name}.fixture.json'), true);
});

test('${name} reader rejects other formats', () => {
  // A reader that claims another tool's file corrupts someone's evidence.
  assert.equal(${symbol}Reader.detect({ violations: [], passes: [] }, 'axe.json'), false);
  assert.equal(${symbol}Reader.detect([], 'empty.json'), false);
  assert.equal(${symbol}Reader.detect({}, 'empty.json'), false);
});

test('${name} reader maps findings to WCAG criteria', () => {
  const file = ${symbol}Reader.read(fixture, '${name}.fixture.json');
  assert.equal(file.reader, '${name}');
  assert.ok(file.findings.length > 0, 'expected at least one finding');

  // TODO: assert the specific mapping you care about, e.g.
  // const alt = file.findings.find((f) => f.ruleId === 'TODO');
  // assert.deepEqual(alt?.criteria, ['1.1.1']);
  // assert.equal(alt?.outcome, 'fail');
});

test('${name} reader output is stable', () => {
  // Determinism is a hard requirement (FR-ART-5): same input, same output.
  const a = ${symbol}Reader.read(fixture, '${name}.fixture.json');
  const b = ${symbol}Reader.read(fixture, '${name}.fixture.json');
  assert.deepEqual(a, b);
});
`;
}
