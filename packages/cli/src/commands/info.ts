import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { listBundledStandards } from '@eaa-kit/core';
import { flagBool, flagString, type ParsedArgs } from '../args.js';
import { listJurisdictions, resolvePacksDir } from '../resolve.js';

interface PackSummary {
  code: string;
  name: string;
  languages: string[];
  quality: string;
  enforcement: string;
}

/** `eaa-kit packs` — the support matrix, from the CLI (DX-6 in text form). */
export function packsCommand(args: ParsedArgs): number {
  const packsDir = resolvePacksDir(flagString(args.flags, 'packs-dir'));
  const summaries: PackSummary[] = listJurisdictions(packsDir).map((code) => {
    const meta = parse(readFileSync(join(packsDir, code, 'pack.yaml'), 'utf8')) as {
      name: string;
      languages: string[];
      quality: string;
      enforcement: { name: string };
    };
    return {
      code,
      name: meta.name,
      languages: meta.languages,
      quality: meta.quality,
      enforcement: meta.enforcement.name,
    };
  });

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(
      JSON.stringify({ packs: summaries, standards: listBundledStandards() }, null, 2) + '\n'
    );
    return 0;
  }

  const width = Math.max(...summaries.map((s) => s.name.length), 10);
  process.stdout.write(`Code  ${'Jurisdiction'.padEnd(width)}  Quality  Languages\n`);
  for (const s of summaries) {
    process.stdout.write(
      `${s.code.padEnd(4)}  ${s.name.padEnd(width)}  ${s.quality.padEnd(7)}  ${s.languages.join(', ')}\n`
    );
  }
  const standards = listBundledStandards();
  process.stdout.write(
    `\n${summaries.length} packs · WCAG ${standards.wcag.join(', ')} · EN 301 549 ${standards.en301549.join(', ')}\n` +
      `Missing your country? eaa-kit contrib scaffold-pack --country xx\n`
  );
  return 0;
}
