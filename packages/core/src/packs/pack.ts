import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { DATA_FILES } from '../generated/data.js';
import { EaaKitError, DOCS_BASE } from '../util/errors.js';
import { validateSchema, type SchemaIssue } from '../util/microschema.js';
import { lintTemplate } from '../render/template.js';
import type { StringTree } from '../i18n/strings.js';

/** Parsed pack.yaml metadata. */
export interface PackMeta {
  schemaVersion: number;
  country: string;
  name: string;
  languages: string[];
  defaultLanguage: string;
  legal: {
    act: string;
    references?: string[];
    sources: string[];
  };
  enforcement: {
    name: string;
    url?: string;
    email?: string;
    phone?: string;
    address?: string;
    verified?: string;
  };
  deadlines?: {
    enforceableSince?: string;
    notes?: string;
  };
  quality: 'bronze' | 'silver' | 'gold';
  maintainers?: string[];
  notes?: string;
}

/** A loaded jurisdiction pack (REQ-PACK-1). */
export interface Pack {
  meta: PackMeta;
  dir: string;
  /** Template name → template source. May come from the fallback pack. */
  templates: Record<string, string>;
  /** Language → string tree. */
  strings: Record<string, StringTree>;
  /** True when this pack has no templates of its own (Bronze minimal). */
  usesFallbackTemplates: boolean;
}

export interface PackValidationResult {
  ok: boolean;
  issues: SchemaIssue[];
  warnings: string[];
}

/** Validate pack.yaml content against the shipped schema (REQ-PACK-2). */
export function validatePackMeta(meta: unknown): SchemaIssue[] {
  const schema = parse(DATA_FILES['pack.schema.yaml']!) as Record<string, unknown>;
  const issues = validateSchema(meta, schema);
  const m = meta as Partial<PackMeta> | null;
  if (m && Array.isArray(m.languages) && typeof m.defaultLanguage === 'string') {
    if (!m.languages.includes(m.defaultLanguage)) {
      issues.push({
        path: '$.defaultLanguage',
        message: `"${m.defaultLanguage}" is not in languages [${m.languages.join(', ')}]`,
      });
    }
  }
  return issues;
}

function readTemplates(dir: string): Record<string, string> {
  const templatesDir = join(dir, 'templates');
  const templates: Record<string, string> = {};
  if (!existsSync(templatesDir)) return templates;
  for (const file of readdirSync(templatesDir).sort()) {
    if (file.endsWith('.mustache')) {
      templates[file.replace(/\.mustache$/, '')] = readFileSync(join(templatesDir, file), 'utf8');
    }
  }
  return templates;
}

function readStrings(dir: string): Record<string, StringTree> {
  const strings: Record<string, StringTree> = {};
  for (const file of readdirSync(dir).sort()) {
    const m = /^strings\.([a-z-]+)\.yaml$/.exec(file);
    if (m) strings[m[1]!] = parse(readFileSync(join(dir, file), 'utf8')) as StringTree;
  }
  return strings;
}

export interface LoadPackOptions {
  /**
   * Directory of the pack providing fallback templates (normally the `eu`
   * pack) so a Bronze pack is just pack.yaml + strings (REQ-PACK-1).
   */
  fallbackTemplatesDir?: string;
}

/**
 * Find leftover scaffold placeholders. Matches TODO as a standalone word so
 * legitimate text containing the letters (e.g. Spanish "todo") is not
 * flagged.
 */
function findPlaceholders(value: unknown, path: string): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (typeof value === 'string') {
    if (/\bTODO\b/.test(value)) {
      issues.push({ path, message: 'still contains a scaffold placeholder (TODO)' });
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => issues.push(...findPlaceholders(v, `${path}[${i}]`)));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      issues.push(...findPlaceholders(v, `${path}.${key}`));
    }
  }
  return issues;
}

/** Load a pack directory; throws actionable errors on invalid packs. */
export function loadPack(dir: string, opts: LoadPackOptions = {}): Pack {
  const metaPath = join(dir, 'pack.yaml');
  if (!existsSync(metaPath)) {
    throw new EaaKitError({
      what: `${dir} is not a jurisdiction pack: pack.yaml is missing.`,
      fix: 'Scaffold one with: eaa-kit contrib scaffold-pack --country <code>',
      docs: `${DOCS_BASE}/packs.md`,
    });
  }
  let meta: unknown;
  try {
    meta = parse(readFileSync(metaPath, 'utf8'));
  } catch (e) {
    throw new EaaKitError({
      what: `${metaPath} is not valid YAML.`,
      why: (e as Error).message,
      fix: 'Fix the YAML syntax; validate with: eaa-kit validate-pack ' + dir,
      docs: `${DOCS_BASE}/packs.md`,
    });
  }
  const issues = validatePackMeta(meta);
  if (issues.length > 0) {
    throw new EaaKitError({
      what: `${metaPath} failed schema validation.`,
      why: issues.map((i) => `${i.path}: ${i.message}`).join('; '),
      fix: 'Validate locally with: eaa-kit validate-pack ' + dir,
      docs: `${DOCS_BASE}/packs.md`,
    });
  }

  let templates = readTemplates(dir);
  let usesFallbackTemplates = false;
  if (Object.keys(templates).length === 0 && opts.fallbackTemplatesDir) {
    templates = readTemplates(opts.fallbackTemplatesDir);
    usesFallbackTemplates = true;
  }

  return {
    meta: meta as PackMeta,
    dir,
    templates,
    strings: readStrings(dir),
    usesFallbackTemplates,
  };
}

/**
 * Full pack validation for CI / `eaa-kit validate-pack` (QA-6): schema,
 * template lint (logic-less, parseable), strings coverage per language.
 */
export function validatePackDir(dir: string, opts: LoadPackOptions = {}): PackValidationResult {
  const issues: SchemaIssue[] = [];
  const warnings: string[] = [];
  let pack: Pack;
  try {
    pack = loadPack(dir, opts);
  } catch (e) {
    if (e instanceof EaaKitError) {
      return { ok: false, issues: [{ path: '$', message: e.why ? `${e.what} (${e.why})` : e.what }], warnings };
    }
    throw e;
  }

  // An unfinished scaffold must not pass validation: a pack whose text
  // still says TODO would render "TODO: Accessibility statement" into a
  // legal document. This is the check that makes CI a real reviewer.
  issues.push(...findPlaceholders(pack.meta, '$'));
  for (const [lang, tree] of Object.entries(pack.strings)) {
    issues.push(...findPlaceholders(tree, `strings.${lang}.yaml`));
  }

  for (const [name, src] of Object.entries(pack.templates)) {
    if (!pack.usesFallbackTemplates) {
      for (const warning of lintTemplate(src)) {
        warnings.push(`templates/${name}.mustache: ${warning}`);
      }
    }
  }
  for (const lang of pack.meta.languages) {
    if (!pack.strings[lang]) {
      issues.push({
        path: `$.languages`,
        message: `pack declares language "${lang}" but strings.${lang}.yaml is missing`,
      });
    }
  }
  for (const lang of Object.keys(pack.strings)) {
    if (!pack.meta.languages.includes(lang)) {
      warnings.push(`strings.${lang}.yaml exists but "${lang}" is not declared in pack.yaml languages`);
    }
  }
  if (pack.meta.quality !== 'bronze' && !pack.meta.enforcement.url) {
    issues.push({
      path: '$.enforcement.url',
      message: `quality "${pack.meta.quality}" requires a verified enforcement-body URL (Silver criteria)`,
    });
  }
  if (pack.meta.quality !== 'bronze' && !pack.meta.enforcement.verified) {
    issues.push({
      path: '$.enforcement.verified',
      message: `quality "${pack.meta.quality}" requires enforcement.verified (date the enforcement details were last checked)`,
    });
  }
  return { ok: issues.length === 0, issues, warnings };
}
