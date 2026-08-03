import type { ConformanceModel, EaaConfig, RenderedArtifact } from '../types.js';
import type { Pack } from '../packs/pack.js';
import { EaaKitError, DOCS_BASE } from '../util/errors.js';
import { resolveStrings, type StringTree } from '../i18n/strings.js';
import { renderTemplate } from './template.js';

export interface StatementRenderOptions {
  lang?: string;
  format: 'html' | 'md';
  reviewedBy?: string;
  reviewedOn?: string;
}

function str(tree: StringTree, path: string): string {
  let cur: StringTree | string = tree;
  for (const part of path.split('.')) {
    if (typeof cur === 'string' || cur[part] === undefined) return path;
    cur = cur[part]!;
  }
  return typeof cur === 'string' ? cur : path;
}

/**
 * Build the view model handed to pack statement templates. This object is
 * the pack-template contract — documented in docs/packs.md; extending it
 * is fine, renaming/removing keys is a breaking change for packs.
 */
export function buildStatementView(
  conformance: ConformanceModel,
  config: EaaConfig,
  pack: Pack,
  opts: StatementRenderOptions
): Record<string, unknown> {
  const lang = opts.lang ?? pack.meta.defaultLanguage;
  if (!pack.meta.languages.includes(lang)) {
    throw new EaaKitError({
      what: `Pack "${pack.meta.country}" does not ship language "${lang}".`,
      why: `Available languages: ${pack.meta.languages.join(', ')}.`,
      fix: `Pass --lang with one of the available languages, or contribute the translation (strings.${lang}.yaml).`,
      docs: `${DOCS_BASE}/packs.md`,
    });
  }
  const t = resolveStrings(lang, pack.strings[lang]);

  const reviewedBy = opts.reviewedBy ?? config.review?.reviewedBy;
  const reviewedOn = opts.reviewedOn ?? config.review?.reviewedOn;
  const draft = !(reviewedBy && reviewedOn);

  // Criterion names are localizable as data: a pack may ship
  // `criteria: { "1.1.1": "Nicht-Text-Inhalt" }` in its strings file and the
  // statement picks it up. Untranslated criteria fall back to the English
  // W3C name, so a partial translation is always valid.
  const criterionName = (id: string, fallback: string): string => {
    const table = t['criteria'];
    if (table && typeof table === 'object') {
      const localized = (table as Record<string, unknown>)[id];
      if (typeof localized === 'string' && localized !== '') return localized;
    }
    return fallback;
  };

  const nonAccessible = conformance.results
    .filter((r) => r.status === 'fail' || r.status === 'partial')
    .map((r) => ({
      criterion: r.criterion.id,
      name: criterionName(r.criterion.id, r.criterion.name),
      level: r.criterion.level,
      clause: r.clause ?? '',
      statusLabel: str(t, `common.status.${r.status}`),
      messages: dedupe(
        r.trace
          .filter((e) => e.outcome === 'fail' && e.message)
          .map((e) => e.message!)
      ).map((m) => ({ text: m })),
      urls: dedupe(r.trace.flatMap((e) => e.urls)).map((u) => ({ url: u })),
    }));

  const notEvaluated = conformance.results
    .filter((r) => r.status === 'not-evaluated')
    .map((r) => ({
      criterion: r.criterion.id,
      name: criterionName(r.criterion.id, r.criterion.name),
      level: r.criterion.level,
      clause: r.clause ?? '',
    }));

  const burden = config.burden?.claimed
    ? {
        claimed: true,
        exclusions: (config.burden.exclusions ?? []).map((e) => ({
          scope: e.scope,
          reason: e.reason ?? '',
        })),
      }
    : { claimed: false, exclusions: [] };

  return {
    t,
    lang,
    draft,
    watermark: str(t, 'common.draftWatermark'),
    reviewedBy: reviewedBy ?? '',
    reviewedOn: reviewedOn ?? '',
    generatedBy: str(t, 'common.generatedBy'),
    org: {
      name: config.organisation.name,
      email: config.organisation.email ?? '',
      phone: config.organisation.phone ?? '',
      address: config.organisation.address ?? '',
      website: config.organisation.website ?? '',
    },
    product: {
      name: config.product.name,
      scope: config.product.scope ?? '',
      urls: (config.product.urls ?? []).map((u) => ({ url: u })),
    },
    compliance: {
      level: conformance.summary.compliance,
      label: str(t, `common.compliance.${conformance.summary.compliance}`),
      isFull: conformance.summary.compliance === 'full',
      isPartial: conformance.summary.compliance === 'partial',
      isNonCompliant: conformance.summary.compliance === 'non-compliant',
    },
    nonAccessible,
    hasNonAccessible: nonAccessible.length > 0,
    notEvaluated,
    hasNotEvaluated: notEvaluated.length > 0,
    burden,
    dates: {
      preparation: config.dates.preparation,
      lastReview: config.dates.lastReview ?? '',
    },
    method: config.evaluationMethod ?? '',
    feedback: {
      email: config.feedback?.email ?? config.organisation.email ?? '',
      url: config.feedback?.url ?? '',
      phone: config.feedback?.phone ?? '',
    },
    enforcement: {
      name: pack.meta.enforcement.name,
      url: pack.meta.enforcement.url ?? '',
      email: pack.meta.enforcement.email ?? '',
      phone: pack.meta.enforcement.phone ?? '',
      address: pack.meta.enforcement.address ?? '',
    },
    // Optional: some member states route consumers to a conciliation body
    // before the surveillance authority. Absent for most packs.
    conciliation: pack.meta.enforcement.conciliation
      ? {
          name: pack.meta.enforcement.conciliation.name,
          url: pack.meta.enforcement.conciliation.url ?? '',
          email: pack.meta.enforcement.conciliation.email ?? '',
          phone: pack.meta.enforcement.conciliation.phone ?? '',
          address: pack.meta.enforcement.conciliation.address ?? '',
        }
      : { name: '' },
    legal: {
      act: pack.meta.legal.act,
      references: (pack.meta.legal.references ?? []).map((r) => ({ ref: r })),
    },
    standards: {
      wcag: conformance.wcagVersion,
      en: conformance.enVersion,
    },
    country: { code: pack.meta.country, name: pack.meta.name },
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/** Render the accessibility statement via the pack's template (FR-ART-1). */
export function renderStatement(
  conformance: ConformanceModel,
  config: EaaConfig,
  pack: Pack,
  opts: StatementRenderOptions
): RenderedArtifact {
  const templateName = `statement.${opts.format}`;
  const template = pack.templates[templateName];
  if (!template) {
    throw new EaaKitError({
      what: `Pack "${pack.meta.country}" has no ${templateName}.mustache template (and no fallback was found).`,
      fix: 'Pass the packs directory of @eaa-kit/packs, or add the template to the pack.',
      docs: `${DOCS_BASE}/packs.md`,
    });
  }
  const view = buildStatementView(conformance, config, pack, opts);
  return {
    kind: 'statement',
    format: opts.format,
    lang: view['lang'] as string,
    filenameHint: `statement.${pack.meta.country}.${view['lang']}.${opts.format}`,
    content: renderTemplate(template, view),
  };
}
