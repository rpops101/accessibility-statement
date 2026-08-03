/**
 * Determinism helpers (FR-ART-5): identical inputs must produce
 * byte-identical outputs — stable key ordering, stable sorts, no wall clock.
 */

/** Recursively sort object keys; leaves arrays in their (already stable) order. */
export function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeysDeep(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

/** JSON.stringify with deterministic key order and trailing newline. */
export function stableJson(value: unknown, indent = 2): string {
  return JSON.stringify(sortKeysDeep(value), null, indent) + '\n';
}

/**
 * Compare dotted numeric ids ("1.4.10" < "1.4.2" is false — numeric-aware).
 * Non-numeric segments compare lexicographically after numeric ones.
 */
export function compareDotted(a: string, b: string): number {
  const as = a.split('.');
  const bs = b.split('.');
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const x = as[i];
    const y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = Number(x);
    const yn = Number(y);
    const xIsNum = Number.isFinite(xn);
    const yIsNum = Number.isFinite(yn);
    if (xIsNum && yIsNum) {
      if (xn !== yn) return xn - yn;
    } else if (xIsNum) {
      return -1;
    } else if (yIsNum) {
      return 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** Deduplicate + sort a string array (plain lexicographic). */
export function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}
