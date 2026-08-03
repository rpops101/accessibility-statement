import type { ConformanceModel, EaaConfig, RenderedArtifact } from '../types.js';
import type { Pack } from '../packs/pack.js';
import { EaaKitError, DOCS_BASE } from '../util/errors.js';
import { renderTemplate } from './template.js';
import { buildDocx } from './docx.js';
import {
  acrBlocks,
  blocksToDocx,
  blocksToPdf,
  burdenBlocks,
  statementBlocks,
  traceBlocks,
  type BinaryRenderOptions,
} from './doc-model.js';
import { buildStatementView } from './statement.js';

/**
 * DOCX and PDF rendering for all four artifacts (FR-ART-4).
 *
 * Statements prefer a pack-supplied Word template when one exists — that
 * is the Gold quality criterion, and it is a logic-less text template like
 * every other pack template, so packs stay data. Everything else is
 * rendered from the shared block model.
 */

export interface BinaryOptions {
  kind: 'statement' | 'acr' | 'burden' | 'trace';
  format: 'docx' | 'pdf';
  lang: string;
  reviewedBy?: string;
  reviewedOn?: string;
}

function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

export function renderBinary(
  conformance: ConformanceModel,
  config: EaaConfig,
  pack: Pack | undefined,
  opts: BinaryOptions
): RenderedArtifact {
  if (opts.kind === 'statement' && !pack) {
    throw new EaaKitError({
      what: 'Rendering a statement requires a jurisdiction pack.',
      fix: 'Pass a pack loaded with loadPack(), or use the CLI which resolves packs automatically.',
      docs: `${DOCS_BASE}/packs.md`,
    });
  }

  const lang = opts.lang;
  const reviewedBy = opts.reviewedBy ?? config.review?.reviewedBy;
  const reviewedOn = opts.reviewedOn ?? config.review?.reviewedOn;

  const blockOpts: BinaryRenderOptions = {
    lang,
    reviewedBy,
    reviewedOn,
    packStrings: pack?.strings[lang],
    enforcement: pack?.meta.enforcement,
    legal: pack?.meta.legal,
  };

  const titles: Record<BinaryOptions['kind'], string> = {
    statement: `Accessibility statement — ${config.product.name}`,
    acr: `${config.product.name} Accessibility Conformance Report`,
    burden: `Disproportionate-burden assessment — ${config.product.name}`,
    trace: `Conformance traceability report — ${config.product.name}`,
  };

  const blocks =
    opts.kind === 'statement'
      ? statementBlocks(conformance, config, blockOpts)
      : opts.kind === 'acr'
        ? acrBlocks(conformance, config, blockOpts)
        : opts.kind === 'burden'
          ? burdenBlocks(config, blockOpts)
          : traceBlocks(conformance, config, blockOpts);

  // A localized title is better than an English one; the first block of
  // every builder is the artifact's own heading.
  const first = blocks[0];
  const title = first && first.type === 'title' ? first.text : titles[opts.kind];

  let bytes: Uint8Array;
  if (opts.format === 'docx') {
    const meta = {
      title,
      lang,
      creator: config.organisation.name,
      date: config.dates.preparation,
      description: config.product.scope,
    };
    // A pack may own its Word layout via templates/<kind>.docx.xml.mustache.
    const template = pack?.templates[`${opts.kind}.docx.xml`];
    if (opts.kind === 'statement' && template && pack) {
      const view = buildStatementView(conformance, config, pack, {
        lang,
        format: 'md',
        reviewedBy,
        reviewedOn,
      });
      bytes = buildDocx(renderTemplate(template, view), meta);
    } else {
      bytes = blocksToDocx(blocks, meta);
    }
  } else {
    bytes = blocksToPdf(blocks, {
      title,
      lang,
      author: config.organisation.name,
      date: config.dates.preparation,
      subject: config.product.scope,
    });
  }

  const country = pack ? `.${pack.meta.country}` : '';
  return {
    kind: opts.kind,
    format: opts.format,
    lang,
    filenameHint:
      opts.kind === 'statement'
        ? `statement${country}.${lang}.${opts.format}`
        : `${opts.kind}.${opts.format}`,
    content: bytesToLatin1(bytes),
    bytes,
    isBinary: true,
  };
}
