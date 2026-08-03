import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { EaaConfig } from './types.js';
import { A11yStatementError, DOCS_BASE } from './util/errors.js';
import { validateSchema } from './util/microschema.js';

/**
 * Schema for a11y-statement.config.yaml (NFR-9: schema-validate all inputs).
 * Also published as schemas/a11y-statement.config.schema.json for editor support.
 */
export const CONFIG_SCHEMA = {
  type: 'object',
  required: ['organisation', 'product', 'jurisdiction', 'languages', 'evidence', 'dates'],
  properties: {
    organisation: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        website: { type: 'string' },
        employees: { type: 'number', minimum: 0 },
        turnoverEUR: { type: 'number', minimum: 0 },
      },
    },
    product: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        scope: { type: 'string' },
        urls: { type: 'array', items: { type: 'string' } },
      },
    },
    jurisdiction: { type: 'string', pattern: '^[a-z]{2}$' },
    languages: { type: 'array', minItems: 1, items: { type: 'string', pattern: '^[a-z]{2}(-[A-Za-z0-9-]+)?$' } },
    evidence: {
      type: 'object',
      required: ['paths'],
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
        manual: { type: 'string' },
      },
    },
    standards: {
      type: 'object',
      properties: {
        wcag: { type: 'string' },
        en301549: { type: 'string' },
      },
    },
    dates: {
      type: 'object',
      required: ['preparation'],
      properties: {
        preparation: { type: 'string', format: 'date' },
        lastReview: { type: 'string', format: 'date' },
        burdenAssessment: { type: 'string', format: 'date' },
      },
    },
    evaluationMethod: { type: 'string' },
    feedback: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        url: { type: 'string' },
        phone: { type: 'string' },
      },
    },
    review: {
      type: 'object',
      properties: {
        reviewedBy: { type: 'string' },
        reviewedOn: { type: 'string', format: 'date' },
      },
    },
    burden: {
      type: 'object',
      required: ['claimed'],
      properties: {
        claimed: { type: 'boolean' },
        exclusions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['scope'],
            properties: {
              scope: { type: 'string' },
              reason: { type: 'string' },
              criteria: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        costBenefit: {
          type: 'object',
          properties: {
            estimatedCost: { type: 'string' },
            organisationBenefit: { type: 'string' },
            disabledUserImpact: { type: 'string' },
            frequencyOfUse: { type: 'string' },
          },
        },
        notes: { type: 'string' },
      },
    },
  },
} as const;

/** Parse and validate configuration content. */
export function parseConfig(content: string, path: string): EaaConfig {
  let doc: unknown;
  try {
    doc = parse(content);
  } catch (e) {
    throw new A11yStatementError({
      what: `${path} is not valid YAML.`,
      why: (e as Error).message,
      fix: 'Fix the syntax or regenerate with: accessibility-statement init',
      docs: `${DOCS_BASE}/configuration.md`,
    });
  }
  const issues = validateSchema(doc, CONFIG_SCHEMA as unknown as Record<string, unknown>);
  if (issues.length > 0) {
    throw new A11yStatementError({
      what: `${path} failed validation.`,
      why: issues.map((i) => `${i.path}: ${i.message}`).join('; '),
      fix: 'Compare against the annotated example in the docs, or regenerate with: accessibility-statement init',
      docs: `${DOCS_BASE}/configuration.md`,
    });
  }
  return doc as EaaConfig;
}

/** Load configuration from disk. */
export function loadConfig(path: string): EaaConfig {
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch (e) {
    throw new A11yStatementError({
      what: `Cannot read configuration file ${path}.`,
      why: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'The file does not exist.' : (e as Error).message,
      fix: 'Run "accessibility-statement init" to create a11y-statement.config.yaml, or pass --config <path>.',
      docs: `${DOCS_BASE}/configuration.md`,
    });
  }
  return parseConfig(content, path);
}
