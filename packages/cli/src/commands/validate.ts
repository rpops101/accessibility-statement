import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validatePackDir, EaaKitError, DOCS_BASE } from '@eaa-kit/core';
import { flagBool, flagString, type ParsedArgs } from '../args.js';
import { listJurisdictions, resolvePacksDir } from '../resolve.js';

/**
 * `eaa-kit validate-pack [dir|code]` (QA-6) — the contributor's local test
 * runner and the CI gate are the same code path, so "green locally" means
 * "green in CI".
 */
export function validatePackCommand(args: ParsedArgs): number {
  const packsDir = resolvePacksDir(flagString(args.flags, 'packs-dir'));
  const target = args.positionals[0];

  let dirs: string[];
  if (!target) {
    dirs = listJurisdictions(packsDir).map((c) => join(packsDir, c));
  } else if (/^[a-z]{2}$/.test(target) && existsSync(join(packsDir, target, 'pack.yaml'))) {
    dirs = [join(packsDir, target)];
  } else {
    const abs = resolve(target);
    if (!existsSync(join(abs, 'pack.yaml'))) {
      throw new EaaKitError({
        what: `${abs} is not a jurisdiction pack (no pack.yaml).`,
        fix: `Pass a pack directory, a two-letter code (${listJurisdictions(packsDir).join(', ')}), or nothing to validate all packs.`,
        docs: `${DOCS_BASE}/packs.md`,
      });
    }
    dirs = [abs];
  }

  const results = dirs.map((dir) => ({
    dir,
    ...validatePackDir(dir, { fallbackTemplatesDir: join(packsDir, 'eu') }),
  }));
  const failed = results.filter((r) => !r.ok);

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(JSON.stringify({ ok: failed.length === 0, results }, null, 2) + '\n');
    return failed.length === 0 ? 0 : 1;
  }

  for (const result of results) {
    const label = result.dir.slice(result.dir.lastIndexOf('/') + 1);
    if (result.ok && result.warnings.length === 0) {
      process.stdout.write(`  ok       ${label}\n`);
      continue;
    }
    process.stdout.write(`  ${result.ok ? 'warn    ' : 'INVALID '} ${label}\n`);
    for (const issue of result.issues) {
      process.stdout.write(`      error:   ${issue.path} — ${issue.message}\n`);
    }
    for (const warning of result.warnings) {
      process.stdout.write(`      warning: ${warning}\n`);
    }
  }

  if (failed.length > 0) {
    process.stdout.write(
      `\n${failed.length} of ${results.length} pack${results.length === 1 ? '' : 's'} invalid.\n` +
        `The schema is the reviewer: fix the errors above and this becomes mergeable on translation review alone.\n` +
        `Reference: ${DOCS_BASE}/packs.md\n`
    );
    return 1;
  }
  process.stdout.write(
    `\n${results.length} pack${results.length === 1 ? '' : 's'} valid.\n` +
      `Next: npm run update-snapshots -w @eaa-kit/packs\n`
  );
  return 0;
}
