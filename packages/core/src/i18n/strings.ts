import { parse } from 'yaml';
import { DATA_FILES } from '../generated/data.js';

export type StringTree = { [key: string]: string | StringTree };

let coreStringsCache: Map<string, StringTree> | undefined;

/** Core-owned strings for a language, or undefined if not bundled. */
export function coreStrings(lang: string): StringTree | undefined {
  if (!coreStringsCache) {
    coreStringsCache = new Map();
    for (const [key, content] of Object.entries(DATA_FILES)) {
      const m = /^strings\/([a-z-]+)\.yaml$/.exec(key);
      if (m) coreStringsCache.set(m[1]!, parse(content) as StringTree);
    }
  }
  return coreStringsCache.get(lang);
}

/** Deep-merge string trees; later sources win. */
export function mergeStrings(...trees: Array<StringTree | undefined>): StringTree {
  const out: StringTree = {};
  for (const tree of trees) {
    if (!tree) continue;
    mergeInto(out, tree);
  }
  return out;
}

function mergeInto(target: StringTree, source: StringTree): void {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      target[key] = value;
    } else if (value && typeof value === 'object') {
      const existing = target[key];
      const base = existing && typeof existing === 'object' ? existing : {};
      target[key] = base as StringTree;
      mergeInto(base as StringTree, value);
    }
  }
}

/**
 * Resolve the string tree for rendering (NFR-6): core English fallback,
 * then core strings for the language (if bundled), then the pack's own
 * strings for the language — most specific wins.
 */
export function resolveStrings(lang: string, packStrings?: StringTree): StringTree {
  return mergeStrings(coreStrings('en'), coreStrings(lang), packStrings);
}
