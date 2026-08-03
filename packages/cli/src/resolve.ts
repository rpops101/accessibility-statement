import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EaaKitError, DOCS_BASE, loadPack, type Pack } from '@eaa-kit/core';

/**
 * Locate the bundled @eaa-kit/packs directory without any network access
 * (NFR-1). Checked in order: --packs-dir, EAA_KIT_PACKS_DIR, the installed
 * dependency, then the monorepo checkout (for contributors).
 */
export function resolvePacksDir(explicit?: string): string {
  const candidates: string[] = [];
  if (explicit) candidates.push(resolve(explicit));
  if (process.env['EAA_KIT_PACKS_DIR']) candidates.push(resolve(process.env['EAA_KIT_PACKS_DIR']));

  const here = dirname(fileURLToPath(import.meta.url));
  // Installed layout: node_modules/eaa-kit/dist/ → node_modules/@eaa-kit/packs/packs
  candidates.push(resolve(here, '..', '..', '@eaa-kit', 'packs', 'packs'));
  candidates.push(resolve(here, '..', 'node_modules', '@eaa-kit', 'packs', 'packs'));
  // Monorepo layout: packages/cli/{src,dist}/ → packages/packs/packs
  candidates.push(resolve(here, '..', '..', 'packs', 'packs'));

  for (const dir of candidates) {
    if (existsSync(join(dir, 'eu', 'pack.yaml'))) return dir;
  }
  throw new EaaKitError({
    what: 'Could not find the jurisdiction packs directory.',
    why: `Looked in: ${candidates.join(', ')}`,
    fix: 'Install @eaa-kit/packs alongside eaa-kit, or pass --packs-dir <path>.',
    docs: `${DOCS_BASE}/packs.md`,
  });
}

/** List available jurisdiction codes, sorted. */
export function listJurisdictions(packsDir: string): string[] {
  return readdirSync(packsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(packsDir, e.name, 'pack.yaml')))
    .map((e) => e.name)
    .sort();
}

/** Load a pack by jurisdiction code, with the EU pack as template fallback. */
export function resolvePack(packsDir: string, code: string): Pack {
  const dir = join(packsDir, code);
  if (!existsSync(join(dir, 'pack.yaml'))) {
    const available = listJurisdictions(packsDir);
    throw new EaaKitError({
      what: `No jurisdiction pack for "${code}".`,
      why: `Available packs: ${available.join(', ')}.`,
      fix: `Use --jurisdiction with one of those, or create the pack: eaa-kit contrib scaffold-pack --country ${code}. New packs are the most welcome contribution.`,
      docs: `${DOCS_BASE}/packs.md`,
    });
  }
  return loadPack(dir, { fallbackTemplatesDir: join(packsDir, 'eu') });
}

/**
 * Expand evidence path entries. Supports plain files, directories (all
 * *.json inside) and a trailing `*` / `**` wildcard segment — enough for
 * CI layouts without a glob dependency (NFR-2).
 */
export function expandEvidencePaths(patterns: string[], baseDir: string): string[] {
  const out = new Set<string>();
  for (const pattern of patterns) {
    const abs = isAbsolute(pattern) ? pattern : join(baseDir, pattern);
    const star = abs.search(/[*?]/);
    if (star === -1) {
      if (existsSync(abs) && statSync(abs).isDirectory()) {
        for (const f of readdirSync(abs).sort()) {
          if (f.endsWith('.json')) out.add(join(abs, f));
        }
      } else {
        out.add(abs);
      }
      continue;
    }
    const sep = abs.lastIndexOf('/', star);
    const dir = abs.slice(0, sep === -1 ? 0 : sep) || '.';
    const rest = abs.slice(sep + 1);
    const recursive = rest.startsWith('**');
    const filePattern = recursive ? rest.replace(/^\*\*\/?/, '') || '*.json' : rest;
    for (const file of walk(dir, recursive)) {
      if (matchesSegment(file.slice(file.lastIndexOf('/') + 1), filePattern)) out.add(file);
    }
  }
  return [...out].sort();
}

function walk(dir: string, recursive: boolean): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        results.push(...walk(p, true));
      }
    } else {
      results.push(p);
    }
  }
  return results;
}

function matchesSegment(name: string, pattern: string): boolean {
  const re = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  return re.test(name);
}
