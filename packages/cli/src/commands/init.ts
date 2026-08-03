import { createInterface } from 'node:readline/promises';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getWcagStandard, manualChecklistTemplate, A11yStatementError } from '@accessibility-statement/core';
import { flagBool, flagString, type ParsedArgs } from '../args.js';
import { listJurisdictions, resolvePacksDir } from '../resolve.js';

/**
 * `accessibility-statement init` — interactive wizard producing a11y-statement.config.yaml (FR-CLI-1).
 * Zero signup, zero network. Every prompt has a default so the whole
 * wizard can be completed by pressing Enter (FR-CLI-5: first artifact in
 * under five minutes). `--yes` skips prompting entirely.
 */
export async function initCommand(args: ParsedArgs): Promise<number> {
  const configPath = resolve(flagString(args.flags, 'config') ?? 'a11y-statement.config.yaml');
  const force = flagBool(args.flags, 'force');
  if (existsSync(configPath) && !force) {
    throw new A11yStatementError({
      what: `${configPath} already exists.`,
      fix: 'Edit it directly, or re-run with --force to overwrite it.',
    });
  }

  const packsDir = resolvePacksDir(flagString(args.flags, 'packs-dir'));
  const jurisdictions = listJurisdictions(packsDir);
  const detectedEvidence = detectEvidenceFiles();
  const nonInteractive = flagBool(args.flags, 'yes') || !process.stdin.isTTY;

  const defaults = {
    organisation: 'My Organisation',
    product: 'My Website',
    jurisdiction: 'eu',
    languages: 'en',
    evidence: detectedEvidence.length > 0 ? detectedEvidence.join(', ') : 'axe.json',
    date: flagString(args.flags, 'date') ?? '2026-01-01',
    email: '',
  };

  let answers = { ...defaults };
  if (!nonInteractive) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const ask = async (question: string, fallback: string): Promise<string> => {
        const reply = (await rl.question(`${question} [${fallback}]: `)).trim();
        return reply === '' ? fallback : reply;
      };
      process.stdout.write('accessibility-statement init — nothing leaves this machine.\n\n');
      answers = {
        organisation: await ask('Organisation name', defaults.organisation),
        product: await ask('Product / service name', defaults.product),
        jurisdiction: await ask(
          `Jurisdiction (${jurisdictions.join(', ')})`,
          defaults.jurisdiction
        ),
        languages: await ask('Statement language(s), comma-separated', defaults.languages),
        evidence: await ask('Evidence file(s) or directory, comma-separated', defaults.evidence),
        date: await ask('Preparation date (YYYY-MM-DD)', defaults.date),
        email: await ask('Accessibility feedback e-mail', defaults.email),
      };
    } finally {
      rl.close();
    }
  }

  const languages = answers.languages
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const evidencePaths = answers.evidence
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const config = renderConfigYaml({
    organisation: answers.organisation,
    product: answers.product,
    jurisdiction: answers.jurisdiction,
    languages,
    evidencePaths,
    date: answers.date,
    email: answers.email,
  });
  writeFileSync(configPath, config);

  const manualPath = resolve(configPath, '..', 'manual.yaml');
  let manualWritten = false;
  if (!existsSync(manualPath)) {
    writeFileSync(manualPath, manualChecklistTemplate(getWcagStandard('2.1')));
    manualWritten = true;
  }

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(
      JSON.stringify({ configPath, manualPath: manualWritten ? manualPath : null }, null, 2) + '\n'
    );
  } else {
    process.stdout.write(`\nWrote ${configPath}\n`);
    if (manualWritten) {
      process.stdout.write(
        `Wrote ${manualPath} (manual checklist template — the criteria automation cannot judge)\n`
      );
    }
    process.stdout.write(
      `\nNext: accessibility-statement render statement --jurisdiction ${answers.jurisdiction} --lang ${languages[0] ?? 'en'}\n`
    );
  }
  return 0;
}

function detectEvidenceFiles(): string[] {
  const found: string[] = [];
  for (const candidate of ['axe.json', 'pa11y.json', 'lighthouse.json', 'a11y', 'reports']) {
    if (existsSync(candidate)) found.push(candidate);
  }
  if (found.length === 0 && existsSync('.')) {
    for (const f of readdirSync('.').sort()) {
      if (/^(axe|pa11y|lighthouse).*\.json$/i.test(f)) found.push(f);
    }
  }
  return found;
}

interface ConfigAnswers {
  organisation: string;
  product: string;
  jurisdiction: string;
  languages: string[];
  evidencePaths: string[];
  date: string;
  email: string;
}

/** Emit a commented config — the file is documentation as much as data. */
function renderConfigYaml(a: ConfigAnswers): string {
  const yamlList = (items: string[], indent = '    ') =>
    items.map((i) => `${indent}- ${JSON.stringify(i)}`).join('\n');
  return `# accessibility-statement configuration. Everything here is local: accessibility-statement never
# accesses the network (NFR-1). Full reference: docs/configuration.md
organisation:
  name: ${JSON.stringify(a.organisation)}
${a.email ? `  email: ${JSON.stringify(a.email)}\n` : ''}  # Employee count and turnover drive the micro-enterprise check in the
  # disproportionate-burden worksheet. Omit them if you prefer.
  # employees: 42
  # turnoverEUR: 5000000

product:
  name: ${JSON.stringify(a.product)}
  # What the statement covers — shown verbatim in the artifact.
  # scope: "The statement covers the public website at example.org."
  # urls:
  #   - "https://example.org/"

# ISO 3166-1 alpha-2 code of the jurisdiction pack to use ("eu" = generic
# EU model statement). See the support matrix in the README.
jurisdiction: ${JSON.stringify(a.jurisdiction)}

# Statement languages, most important first.
languages:
${yamlList(a.languages, '  ')}

evidence:
  # Files, directories or wildcard patterns. Supported report formats:
  # axe-core JSON, pa11y JSON / pa11y-ci JSON, Lighthouse JSON.
  paths:
${yamlList(a.evidencePaths)}
  # The manual checklist covers criteria automation cannot judge.
  manual: "manual.yaml"

# Dates are explicit so output is byte-identical across runs (FR-ART-5).
dates:
  preparation: ${JSON.stringify(a.date)}
  # lastReview: "2026-12-01"
  # burdenAssessment: "2026-07-01"

evaluationMethod: "Self-assessment with automated testing and a manual checklist."

${
    a.email
      ? `feedback:
  email: ${JSON.stringify(a.email)}
  # url: "https://example.org/accessibility-feedback"`
      : `# How users report accessibility problems to you. The statement must
# carry a feedback mechanism, so fill at least one of these in.
# feedback:
#   email: "accessibility@example.org"
#   url: "https://example.org/accessibility-feedback"`
  }

# Filling both fields removes the draft watermark from generated artifacts
# (FR-ART-7). Only do that once a responsible person has actually reviewed
# them — the same effect is available per-run via --reviewed-by/--reviewed-on.
# review:
#   reviewedBy: "Jane Doe, Accessibility Officer"
#   reviewedOn: "2026-12-01"

# Disproportionate-burden claim (Article 14 EAA). Renders the worksheet.
# burden:
#   claimed: true
#   exclusions:
#     - scope: "Archived PDF documents published before 2020"
#       reason: "Remediation cost estimated at 40 person-days for <0.1% of traffic."
#   costBenefit:
#     estimatedCost: ""
#     organisationBenefit: ""
#     disabledUserImpact: ""
#     frequencyOfUse: ""

# Standard versions are pluggable (FR-MAP-4). Defaults shown.
# standards:
#   wcag: "2.1"
#   en301549: "3.2.1"
`;
}
