import type { ConformanceModel, EaaConfig } from '../types.js';
import type { StringTree } from '../i18n/strings.js';
import { resolveStrings } from '../i18n/strings.js';
import { reassessmentDate } from './burden.js';
import { buildOpenAcr } from './acr.js';
import {
  buildDocx,
  docxBullet,
  docxHeading,
  docxParagraph,
  docxTable,
  docxTitle,
  type DocxMeta,
} from './docx.js';
import { buildPdf, type PdfMeta } from './pdf.js';

/**
 * A small block model shared by the DOCX and PDF renderers.
 *
 * HTML and Markdown come from pack templates, because their wording and
 * ordering are jurisdiction-specific. The binary formats need a structured
 * document instead of a string, so the blocks below are the interchange:
 * one builder per artifact, two backends over it. Adding a third backend
 * later means writing one file, not four.
 */

export type DocBlock =
  | { type: 'title' | 'h1' | 'h2' | 'h3' | 'p' | 'bullet' | 'note' | 'meta'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function stringLookup(t: StringTree) {
  return (path: string): string => {
    let cur: StringTree | string | undefined = t;
    for (const part of path.split('.')) {
      if (cur === undefined || typeof cur === 'string') return path;
      cur = cur[part];
    }
    return typeof cur === 'string' ? cur : path;
  };
}

/** Draft watermark or reviewer attribution — every artifact opens with one. */
function reviewBlocks(
  s: (path: string) => string,
  reviewedBy: string | undefined,
  reviewedOn: string | undefined
): DocBlock[] {
  if (reviewedBy && reviewedOn) {
    return [
      {
        type: 'meta',
        text: `${s('common.reviewedBy')}: ${reviewedBy} · ${s('common.reviewedOn')}: ${reviewedOn}`,
      },
    ];
  }
  return [{ type: 'note', text: s('common.draftWatermark') }];
}

export interface BinaryRenderOptions {
  lang: string;
  reviewedBy?: string;
  reviewedOn?: string;
  /** Pack strings, when rendering a jurisdiction statement. */
  packStrings?: StringTree;
  /** Enforcement body details from the pack. */
  enforcement?: {
    name: string;
    url?: string;
    email?: string;
    phone?: string;
    address?: string;
    conciliation?: {
      name: string;
      url?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
  };
  legal?: { act: string; references?: string[] };
}

/** Accessibility statement as blocks (mirrors the HTML template's structure). */
export function statementBlocks(
  conformance: ConformanceModel,
  config: EaaConfig,
  opts: BinaryRenderOptions
): DocBlock[] {
  const t = resolveStrings(opts.lang, opts.packStrings);
  const s = stringLookup(t);
  const criterionName = (id: string, fallback: string): string => {
    const table = t['criteria'];
    if (table && typeof table === 'object') {
      const localized = (table as Record<string, unknown>)[id];
      if (typeof localized === 'string' && localized !== '') return localized;
    }
    return fallback;
  };

  const blocks: DocBlock[] = [];
  blocks.push({ type: 'title', text: `${s('statement.title')} — ${config.product.name}` });
  blocks.push(...reviewBlocks(s, opts.reviewedBy, opts.reviewedOn));
  blocks.push({
    type: 'p',
    text: `${config.organisation.name}: ${s('statement.forProduct')} ${config.product.name}.${
      config.product.scope ? ` ${config.product.scope}` : ''
    }`,
  });
  for (const url of config.product.urls ?? []) blocks.push({ type: 'meta', text: url });

  blocks.push({ type: 'h1', text: s('statement.complianceStatusHeading') });
  const level = conformance.summary.compliance;
  const sentence =
    level === 'full'
      ? s('statement.complianceSentence.full')
      : level === 'partial'
        ? s('statement.complianceSentence.partial')
        : s('statement.complianceSentence.nonCompliant');
  blocks.push({ type: 'p', text: `${config.product.name} ${sentence}` });

  const failing = conformance.results.filter((r) => r.status === 'fail' || r.status === 'partial');
  if (failing.length > 0) {
    blocks.push({ type: 'h1', text: s('statement.nonAccessibleHeading') });
    blocks.push({ type: 'p', text: s('statement.nonAccessibleIntro') });
    for (const r of failing) {
      const messages = [...new Set(r.trace.filter((e) => e.outcome === 'fail' && e.message).map((e) => e.message!))].sort();
      blocks.push({
        type: 'bullet',
        text:
          `${s('statement.criterionLabel')} ${r.criterion.id} — ${criterionName(r.criterion.id, r.criterion.name)} ` +
          `(${s(`common.status.${r.status}`)}; ${s('statement.clauseLabel')} ${r.clause ?? ''})` +
          (messages.length > 0 ? ` ${messages.join(' ')}` : ''),
      });
    }
  }

  if (config.burden?.claimed) {
    blocks.push({ type: 'h1', text: s('statement.burdenHeading') });
    blocks.push({ type: 'p', text: s('statement.burdenIntro') });
    for (const exclusion of config.burden.exclusions ?? []) {
      blocks.push({
        type: 'bullet',
        text: exclusion.reason ? `${exclusion.scope} — ${exclusion.reason}` : exclusion.scope,
      });
    }
  }

  const notEvaluated = conformance.results.filter((r) => r.status === 'not-evaluated');
  if (notEvaluated.length > 0) {
    blocks.push({ type: 'h1', text: s('statement.notEvaluatedHeading') });
    blocks.push({ type: 'p', text: s('statement.notEvaluatedIntro') });
    for (const r of notEvaluated) {
      blocks.push({
        type: 'bullet',
        text: `${r.criterion.id} — ${criterionName(r.criterion.id, r.criterion.name)}`,
      });
    }
  }

  blocks.push({ type: 'h1', text: s('statement.preparationHeading') });
  blocks.push({ type: 'p', text: `${s('statement.preparedOn')} ${config.dates.preparation}.` });
  if (config.evaluationMethod) {
    blocks.push({ type: 'p', text: `${s('statement.method')}: ${config.evaluationMethod}` });
  }
  if (config.dates.lastReview) {
    blocks.push({ type: 'p', text: `${s('statement.lastReviewed')} ${config.dates.lastReview}.` });
  }

  blocks.push({ type: 'h1', text: s('statement.feedbackHeading') });
  blocks.push({ type: 'p', text: s('statement.feedbackIntro') });
  for (const contact of [
    config.feedback?.email ?? config.organisation.email,
    config.feedback?.url,
    config.feedback?.phone,
  ]) {
    if (contact) blocks.push({ type: 'bullet', text: contact });
  }

  blocks.push({ type: 'h1', text: s('statement.enforcementHeading') });
  blocks.push({ type: 'p', text: s('statement.enforcementIntro') });
  if (opts.enforcement) {
    for (const detail of [
      opts.enforcement.name,
      opts.enforcement.address,
      opts.enforcement.email,
      opts.enforcement.phone,
      opts.enforcement.url,
    ]) {
      if (detail) blocks.push({ type: 'bullet', text: detail });
    }
    const conciliation = opts.enforcement.conciliation;
    if (conciliation) {
      blocks.push({ type: 'p', text: s('statement.conciliationIntro') });
      for (const detail of [
        conciliation.name,
        conciliation.address,
        conciliation.email,
        conciliation.phone,
        conciliation.url,
      ]) {
        if (detail) blocks.push({ type: 'bullet', text: detail });
      }
    }
  }

  const references = opts.legal?.references ?? [];
  blocks.push({
    type: 'meta',
    text: [opts.legal?.act, ...references].filter(Boolean).join(' · '),
  });
  blocks.push({
    type: 'meta',
    text: `EN 301 549 v${conformance.enVersion} · WCAG ${conformance.wcagVersion} · ${s('common.generatedBy')}`,
  });

  return blocks;
}

/** ACR as blocks. */
export function acrBlocks(
  conformance: ConformanceModel,
  config: EaaConfig,
  opts: BinaryRenderOptions
): DocBlock[] {
  const t = resolveStrings(opts.lang);
  const s = stringLookup(t);
  const doc = buildOpenAcr(conformance, config) as unknown as {
    title: string;
    catalog: string;
    report_date: string;
    legal_disclaimer: string;
  };

  const blocks: DocBlock[] = [];
  blocks.push({ type: 'title', text: doc.title });
  blocks.push(...reviewBlocks(s, opts.reviewedBy, opts.reviewedOn));
  blocks.push({ type: 'meta', text: `${s('acr.basedOn')} · ${doc.report_date}` });

  blocks.push({ type: 'h1', text: s('acr.productHeading') });
  blocks.push({ type: 'bullet', text: config.product.name });
  blocks.push({ type: 'bullet', text: config.organisation.name });
  blocks.push({ type: 'bullet', text: doc.catalog });

  const adherence: Record<string, string> = {
    pass: 'supports',
    fail: 'does-not-support',
    partial: 'partially-supports',
    'not-applicable': 'not-applicable',
    'not-evaluated': 'not-evaluated',
  };

  for (const [heading, wcagLevel] of [
    [s('acr.chapterA'), 'A'],
    [s('acr.chapterAA'), 'AA'],
  ] as const) {
    blocks.push({ type: 'h1', text: heading });
    blocks.push({
      type: 'table',
      headers: [s('acr.criterionHeading'), 'EN 301 549', s('acr.levelHeading'), s('acr.remarksHeading')],
      rows: conformance.results
        .filter((r) => r.criterion.level === wcagLevel)
        .map((r) => [
          `${r.criterion.id} ${r.criterion.name}`,
          r.clause ?? '—',
          adherence[r.status] ?? r.status,
          s(`common.status.${r.status}`),
        ]),
    });
  }

  blocks.push({ type: 'meta', text: doc.legal_disclaimer });
  return blocks;
}

/** Disproportionate-burden worksheet as blocks. */
export function burdenBlocks(config: EaaConfig, opts: BinaryRenderOptions): DocBlock[] {
  const t = resolveStrings(opts.lang);
  const s = stringLookup(t);
  const burden = config.burden ?? { claimed: false };
  const assessmentDate = config.dates.burdenAssessment ?? config.dates.preparation;
  const { employees, turnoverEUR } = config.organisation;
  const micro =
    employees === undefined || turnoverEUR === undefined
      ? 'Unknown'
      : employees < 10 && turnoverEUR <= 2_000_000
        ? 'Yes'
        : 'No';

  const blocks: DocBlock[] = [];
  blocks.push({ type: 'title', text: s('burden.title') });
  blocks.push(...reviewBlocks(s, opts.reviewedBy, opts.reviewedOn));
  blocks.push({ type: 'meta', text: s('burden.subtitle') });

  blocks.push({ type: 'h1', text: s('burden.orgHeading') });
  blocks.push({ type: 'bullet', text: config.organisation.name });
  blocks.push({ type: 'bullet', text: `${s('burden.employees')}: ${employees ?? '—'}` });
  blocks.push({ type: 'bullet', text: `${s('burden.turnover')}: ${turnoverEUR ?? '—'}` });

  blocks.push({ type: 'h1', text: s('burden.microHeading') });
  blocks.push({ type: 'p', text: s(`burden.micro${micro}`) });

  blocks.push({ type: 'h1', text: s('burden.claimHeading') });
  blocks.push({ type: 'p', text: s(burden.claimed ? 'burden.claimed' : 'burden.notClaimed') });

  const exclusions = burden.claimed ? (burden.exclusions ?? []) : [];
  if (exclusions.length > 0) {
    blocks.push({ type: 'h2', text: s('burden.exclusionsHeading') });
    blocks.push({
      type: 'table',
      headers: ['Scope', 'Reason', 'Criteria'],
      rows: exclusions.map((e) => [e.scope, e.reason ?? '', (e.criteria ?? []).join(', ')]),
    });
  }

  const cb = burden.costBenefit ?? {};
  blocks.push({ type: 'h1', text: s('burden.costBenefitHeading') });
  blocks.push({
    type: 'table',
    headers: ['Criterion', 'Assessment'],
    rows: [
      [s('burden.estimatedCost'), cb.estimatedCost ?? '(to be completed)'],
      [s('burden.organisationBenefit'), cb.organisationBenefit ?? '(to be completed)'],
      [s('burden.disabledUserImpact'), cb.disabledUserImpact ?? '(to be completed)'],
      [s('burden.frequencyOfUse'), cb.frequencyOfUse ?? '(to be completed)'],
    ],
  });

  blocks.push({ type: 'h1', text: s('burden.reassessmentHeading') });
  blocks.push({ type: 'p', text: `${s('burden.assessmentDate')}: ${assessmentDate}` });
  blocks.push({
    type: 'p',
    text: `${s('burden.reassessmentText')} ${reassessmentDate(assessmentDate)}`,
  });

  if (burden.notes) {
    blocks.push({ type: 'h1', text: s('burden.notesHeading') });
    blocks.push({ type: 'p', text: burden.notes });
  }
  return blocks;
}

/** Traceability report as blocks. */
export function traceBlocks(
  conformance: ConformanceModel,
  config: EaaConfig,
  opts: BinaryRenderOptions
): DocBlock[] {
  const t = resolveStrings(opts.lang);
  const s = stringLookup(t);
  const blocks: DocBlock[] = [];

  blocks.push({ type: 'title', text: s('trace.title') });
  blocks.push({ type: 'p', text: s('trace.intro') });
  blocks.push({
    type: 'meta',
    text: `${config.product.name} · WCAG ${conformance.wcagVersion} · EN 301 549 ${conformance.enVersion}`,
  });

  const conflicts = conformance.results.flatMap((r) => r.conflicts);
  if (conflicts.length > 0) {
    blocks.push({ type: 'h1', text: s('trace.conflictsHeading') });
    blocks.push({ type: 'p', text: s('trace.conflictsIntro') });
    for (const c of conflicts) {
      blocks.push({ type: 'bullet', text: `${c.criterion} — ${c.description}` });
    }
  }

  blocks.push({
    type: 'table',
    headers: [
      s('trace.criterion'),
      s('trace.clause'),
      s('trace.statusLabel'),
      s('trace.decidedBy'),
      s('trace.evidenceLabel'),
    ],
    rows: conformance.results.map((r) => [
      `${r.criterion.id} ${r.criterion.name}`,
      r.clause ?? '—',
      r.status,
      s(`trace.decidedByValues.${r.decidedBy}`),
      r.trace
        .map((e) => {
          const parts = [e.source];
          if (e.ruleId) parts.push(e.ruleId);
          if (e.urls.length > 0) parts.push(e.urls.join(' '));
          return `${parts.join(' · ')} → ${e.outcome}`;
        })
        .join('; ') || '—',
    ]),
  });

  if (conformance.unmappedFindings.length > 0) {
    blocks.push({ type: 'h1', text: s('trace.unmappedHeading') });
    blocks.push({ type: 'p', text: s('trace.unmappedIntro') });
    for (const f of conformance.unmappedFindings) {
      blocks.push({
        type: 'bullet',
        text: `${f.source} · ${f.ruleId} → ${f.outcome}${f.url ? ` (${f.url})` : ''}`,
      });
    }
  }
  return blocks;
}

/* ------------------------------------------------------------------ *
 * Backends
 * ------------------------------------------------------------------ */

/** Render blocks to WordprocessingML body XML. */
export function blocksToDocxBody(blocks: DocBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'table':
          return docxTable(block.headers, block.rows);
        case 'title':
          return docxTitle(block.text);
        case 'h1':
          return docxHeading(block.text, 1);
        case 'h2':
          return docxHeading(block.text, 2);
        case 'h3':
          return docxHeading(block.text, 3);
        case 'bullet':
          return docxBullet(block.text);
        case 'note':
          return docxParagraph(block.text, 'DraftNotice');
        case 'meta':
          return docxParagraph(block.text);
        default:
          return docxParagraph(block.text);
      }
    })
    .join('\n');
}

export function blocksToDocx(blocks: DocBlock[], meta: DocxMeta): Uint8Array {
  return buildDocx(blocksToDocxBody(blocks), meta);
}

export function blocksToPdf(blocks: DocBlock[], meta: PdfMeta): Uint8Array {
  return buildPdf(blocks, meta);
}
