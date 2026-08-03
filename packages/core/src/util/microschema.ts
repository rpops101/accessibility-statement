/**
 * Minimal JSON-Schema-subset validator, vendored per DEPENDENCIES.md.
 *
 * Supports the subset accessibility-statement's own schemas use:
 *   type, properties, required, additionalProperties (boolean),
 *   items, enum, pattern, minimum, maximum, minLength, minItems,
 *   format: "date" (ISO 8601 calendar date).
 *
 * It is NOT a general JSON Schema implementation and must only be used
 * with schemas shipped in this repository.
 */

export interface SchemaIssue {
  path: string;
  message: string;
}

type Schema = Record<string, unknown>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function typeMatches(actual: string, expected: string): boolean {
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

export function validateSchema(value: unknown, schema: Schema, path = '$'): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const t = typeOf(value);

  const expected = schema['type'];
  if (typeof expected === 'string' && !typeMatches(t, expected)) {
    issues.push({ path, message: `expected ${expected}, got ${t}` });
    return issues; // no point descending with the wrong type
  }

  const en = schema['enum'];
  if (Array.isArray(en) && !en.some((e) => e === value)) {
    issues.push({ path, message: `must be one of: ${en.map(String).join(', ')}` });
  }

  if (typeof value === 'string') {
    const pattern = schema['pattern'];
    if (typeof pattern === 'string' && !new RegExp(pattern).test(value)) {
      issues.push({ path, message: `does not match pattern ${pattern}` });
    }
    const minLength = schema['minLength'];
    if (typeof minLength === 'number' && value.length < minLength) {
      issues.push({ path, message: `must be at least ${minLength} characters` });
    }
    if (schema['format'] === 'date' && !DATE_RE.test(value)) {
      issues.push({ path, message: `must be an ISO date (YYYY-MM-DD)` });
    }
  }

  if (typeof value === 'number') {
    const min = schema['minimum'];
    if (typeof min === 'number' && value < min) {
      issues.push({ path, message: `must be >= ${min}` });
    }
    const max = schema['maximum'];
    if (typeof max === 'number' && value > max) {
      issues.push({ path, message: `must be <= ${max}` });
    }
  }

  if (Array.isArray(value)) {
    const minItems = schema['minItems'];
    if (typeof minItems === 'number' && value.length < minItems) {
      issues.push({ path, message: `must have at least ${minItems} items` });
    }
    const items = schema['items'];
    if (items && typeof items === 'object') {
      value.forEach((item, i) => {
        issues.push(...validateSchema(item, items as Schema, `${path}[${i}]`));
      });
    }
  }

  if (t === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const required = schema['required'];
    if (Array.isArray(required)) {
      for (const key of required) {
        if (typeof key === 'string' && !(key in obj)) {
          issues.push({ path: `${path}.${key}`, message: 'required property missing' });
        }
      }
    }
    const props = schema['properties'];
    if (props && typeof props === 'object') {
      for (const [key, sub] of Object.entries(props as Record<string, Schema>)) {
        if (key in obj) {
          issues.push(...validateSchema(obj[key], sub, `${path}.${key}`));
        }
      }
      if (schema['additionalProperties'] === false) {
        for (const key of Object.keys(obj)) {
          if (!(key in (props as Record<string, unknown>))) {
            issues.push({ path: `${path}.${key}`, message: 'unknown property' });
          }
        }
      }
    }
  }

  return issues;
}
