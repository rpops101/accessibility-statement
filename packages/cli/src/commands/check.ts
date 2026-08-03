import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildLock, diffLock, serializeLock, EaaKitError, DOCS_BASE, type LockFile } from '@eaa-kit/core';
import { flagBool, flagString, type ParsedArgs } from '../args.js';
import { loadProject } from '../context.js';

/**
 * `eaa-kit check` — CI regression mode (FR-CLI-3).
 * Compares current conformance against the committed eaa.lock.json and
 * exits non-zero when a criterion regressed. `--update` rewrites the
 * baseline (the intentional-change path).
 */
export function checkCommand(args: ParsedArgs): number {
  const project = loadProject(args);
  const lockPath = resolve(flagString(args.flags, 'lock') ?? 'eaa.lock.json');
  const current = buildLock(project.conformance);
  const json = flagBool(args.flags, 'json');
  const update = flagBool(args.flags, 'update');

  if (!existsSync(lockPath)) {
    if (!update) {
      throw new EaaKitError({
        what: `No conformance baseline at ${lockPath}.`,
        why: 'check compares the current run against a committed baseline; there is nothing to compare against yet.',
        fix: 'Create and commit it: eaa-kit check --update',
        docs: `${DOCS_BASE}/ci.md`,
      });
    }
    writeFileSync(lockPath, serializeLock(current));
    report(json, { created: lockPath, ...summarize(project.conformance.summary.totals) }, () => {
      process.stdout.write(`Created baseline ${lockPath}\n`);
    });
    return 0;
  }

  const baseline = readLock(lockPath);
  const diff = diffLock(baseline, current);

  if (update) {
    writeFileSync(lockPath, serializeLock(current));
    report(json, { updated: lockPath, diff }, () => {
      process.stdout.write(`Updated baseline ${lockPath}\n`);
      printDiff(diff.regressions, 'Recorded regressions');
      printDiff(diff.improvements, 'Recorded improvements');
    });
    return 0;
  }

  const standardChanged =
    baseline.wcagVersion !== current.wcagVersion || baseline.enVersion !== current.enVersion;

  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: diff.regressions.length === 0,
          lockPath,
          standardChanged,
          baselineStandards: { wcag: baseline.wcagVersion, en301549: baseline.enVersion },
          currentStandards: { wcag: current.wcagVersion, en301549: current.enVersion },
          ...diff,
          totals: project.conformance.summary.totals,
          compliance: project.conformance.summary.compliance,
        },
        null,
        2
      ) + '\n'
    );
    return diff.regressions.length === 0 ? 0 : 1;
  }

  if (standardChanged) {
    process.stdout.write(
      `Note: baseline used WCAG ${baseline.wcagVersion} / EN 301 549 ${baseline.enVersion}; ` +
        `this run uses WCAG ${current.wcagVersion} / EN 301 549 ${current.enVersion}.\n\n`
    );
  }

  printDiff(diff.improvements, 'Improvements');
  printDiff(diff.neutral, 'Other changes');
  printDiff(diff.regressions, 'Regressions');

  if (diff.regressions.length === 0) {
    const changes = diff.improvements.length + diff.neutral.length;
    process.stdout.write(
      changes === 0
        ? 'No conformance changes against the baseline.\n'
        : `No regressions against the baseline (${changes} other change${changes === 1 ? '' : 's'}).\n`
    );
    return 0;
  }

  process.stdout.write(
    `\n${diff.regressions.length} criterion regression${diff.regressions.length === 1 ? '' : 's'} against ${lockPath}.\n` +
      `Fix the underlying issues, or record the new baseline deliberately with: eaa-kit check --update\n`
  );
  return 1;
}

function readLock(path: string): LockFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new EaaKitError({
      what: `${path} is not valid JSON.`,
      why: (e as Error).message,
      fix: 'Restore it from version control, or regenerate with: eaa-kit check --update',
      docs: `${DOCS_BASE}/ci.md`,
    });
  }
  const lock = parsed as Partial<LockFile>;
  if (lock.lockVersion !== 1 || typeof lock.criteria !== 'object' || lock.criteria === null) {
    throw new EaaKitError({
      what: `${path} is not an eaa-kit lock file (lockVersion 1).`,
      fix: 'Regenerate with: eaa-kit check --update',
      docs: `${DOCS_BASE}/ci.md`,
    });
  }
  return lock as LockFile;
}

function printDiff(changes: Array<{ criterion: string; from: string; to: string }>, heading: string): void {
  if (changes.length === 0) return;
  process.stdout.write(`${heading}:\n`);
  for (const c of changes) {
    process.stdout.write(`  ${c.criterion}: ${c.from} → ${c.to}\n`);
  }
  process.stdout.write('\n');
}

function summarize(totals: Record<string, number>): Record<string, number> {
  return { ...totals };
}

function report(json: boolean, payload: unknown, human: () => void): void {
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  else human();
}
