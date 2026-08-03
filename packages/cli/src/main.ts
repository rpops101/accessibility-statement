#!/usr/bin/env node
/**
 * eaa-kit CLI — a thin wrapper over @eaa-kit/core (FR-API-1).
 *
 * No network access, ever (NFR-1): no telemetry, no update checks, no
 * template fetching. Everything it needs ships in the packages.
 */
import { EaaKitError } from '@eaa-kit/core';
import { parseArgs, flagBool } from './args.js';
import { initCommand } from './commands/init.js';
import { renderCommand, renderAllCommand } from './commands/render.js';
import { checkCommand } from './commands/check.js';
import { contribCommand } from './commands/contrib.js';
import { validatePackCommand } from './commands/validate.js';
import { packsCommand } from './commands/info.js';

const VERSION = '0.1.0';

const HELP = `eaa-kit ${VERSION} — generate the artifacts the European Accessibility Act requires

  Turns accessibility test output you already have (axe-core, pa11y,
  Lighthouse) plus a manual checklist into an EU accessibility statement,
  an ACR/VPAT 2.5 conformance report and a disproportionate-burden
  worksheet. Runs entirely offline.

Usage
  eaa-kit <command> [options]

Commands
  init                      Interactive wizard; writes eaa.config.yaml and a
                            manual checklist template
  render <artifact>         statement | acr | burden | trace
  render-all                Render every artifact into a directory
  check                     Compare against eaa.lock.json; non-zero on regression
  validate-pack [dir|code]  Validate jurisdiction packs (same code path as CI)
  packs                     List available jurisdiction packs
  contrib scaffold-pack     Scaffold a new jurisdiction pack
  contrib scaffold-reader   Scaffold a new evidence-format reader

Common options
  --config <path>           Configuration file (default: eaa.config.yaml)
  --jurisdiction <code>     Pack to use, e.g. de (default: from config)
  --lang <code>             Statement language (default: first configured)
  --format <fmt>            html | md | openacr | json | docx | pdf
                            (default per artifact; docx and pdf need --out)
  --out <path>              Write to a file instead of stdout
  --reviewed-by <name>      Record the reviewer and remove the draft watermark
  --reviewed-on <date>      Review date, YYYY-MM-DD (required with --reviewed-by)
  --json                    Machine-readable output
  --packs-dir <path>        Override the jurisdiction packs directory
  --help, --version

Examples
  eaa-kit init
  eaa-kit render statement --jurisdiction de --lang de --out statement.html
  eaa-kit render acr --format openacr --out acr.yaml
  eaa-kit render statement --format docx --out statement.docx
  eaa-kit check
  eaa-kit contrib scaffold-pack --country pt

Docs: https://github.com/rpops101/eaa-kit
Artifacts are drafts for human review and are not legal advice.
`;

export async function run(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  if (flagBool(args.flags, 'version') || flagBool(args.flags, 'V')) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (!args.command || flagBool(args.flags, 'help') || flagBool(args.flags, 'h')) {
    process.stdout.write(HELP);
    return args.command ? 0 : 1;
  }

  switch (args.command) {
    case 'init':
      return initCommand(args);
    case 'render':
      return renderCommand(args);
    case 'render-all':
      return renderAllCommand(args);
    case 'check':
      return checkCommand(args);
    case 'validate-pack':
      return validatePackCommand(args);
    case 'packs':
      return packsCommand(args);
    case 'contrib':
      return contribCommand(args);
    case 'help':
      process.stdout.write(HELP);
      return 0;
    default:
      throw new EaaKitError({
        what: `Unknown command "${args.command}".`,
        fix: 'Run "eaa-kit --help" to see the available commands.',
      });
  }
}

/** Entry point: formats errors as guidance, never as stack traces (NFR-8). */
export async function main(argv: string[]): Promise<number> {
  try {
    return await run(argv);
  } catch (error) {
    if (error instanceof EaaKitError) {
      process.stderr.write(error.format() + '\n');
      return 2;
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Error: ${message}\n` +
        `  This looks like a bug in eaa-kit rather than a problem with your input.\n` +
        `  Please report it: https://github.com/rpops101/eaa-kit/issues/new\n` +
        (process.env['EAA_KIT_DEBUG'] && error instanceof Error && error.stack
          ? `\n${error.stack}\n`
          : `  Re-run with EAA_KIT_DEBUG=1 for a stack trace.\n`)
    );
    return 2;
  }
}

// Only self-execute as a program, so tests can import run()/main().
const invokedDirectly =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('main.js') || process.argv[1].endsWith('main.ts') || process.argv[1].endsWith('eaa-kit'));

if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
