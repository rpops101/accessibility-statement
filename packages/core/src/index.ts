/**
 * @accessibility-statement/core — the engine behind accessibility-statement (FR-API-1).
 *
 * Typical use:
 *   const evidence = loadEvidence(['axe.json'], { manualPath: 'manual.yaml' });
 *   const conformance = computeConformance(evidence);
 *   const pack = loadPack('node_modules/@accessibility-statement/packs/packs/de', { fallbackTemplatesDir: '.../packs/eu' });
 *   const artifact = renderArtifact(conformance, config, pack, { kind: 'statement', format: 'html', lang: 'de' });
 *
 * No network access, ever (NFR-1). Deterministic output (FR-ART-5).
 */

export * from './types.js';
export { A11yStatementError, DOCS_BASE } from './util/errors.js';
export { stableJson, sortKeysDeep, compareDotted, sortedUnique } from './util/stable.js';
export { validateSchema, type SchemaIssue } from './util/microschema.js';

export {
  loadEvidence,
  mergeEvidence,
  readEvidenceContent,
  getReaders,
  type EvidenceReader,
  type LoadEvidenceOptions,
} from './evidence/registry.js';
export { parseManualChecklist, manualChecklistTemplate } from './evidence/manual.js';

export { getWcagStandard, getEnStandard, enClauseFor, listBundledStandards } from './mapping/standards.js';
export {
  criteriaForAxeRule,
  criteriaForPa11yCode,
  criteriaForLighthouseAudit,
  criterionFromAxeTag,
} from './mapping/rules.js';
export { computeConformance, complianceLevel, sortCriterionIds, type ConformanceOptions } from './mapping/conformance.js';

export { loadConfig, parseConfig, CONFIG_SCHEMA } from './config.js';
export { buildLock, serializeLock, diffLock, type LockFile, type LockDiff, type LockChange } from './lock.js';

export {
  loadPack,
  validatePackDir,
  validatePackMeta,
  type Pack,
  type PackMeta,
  type PackValidationResult,
  type LoadPackOptions,
} from './packs/pack.js';
export { resolveStrings, mergeStrings, coreStrings, type StringTree } from './i18n/strings.js';

export { renderTemplate, lintTemplate, escapeHtml } from './render/template.js';
export { htmlPage, BASE_CSS } from './render/html.js';
export { renderStatement, buildStatementView, type StatementRenderOptions } from './render/statement.js';
export { renderBinary, type BinaryOptions } from './render/binary.js';
export {
  statementBlocks,
  acrBlocks,
  burdenBlocks,
  traceBlocks,
  blocksToDocx,
  blocksToDocxBody,
  blocksToPdf,
  type DocBlock,
  type BinaryRenderOptions,
} from './render/doc-model.js';
export { buildDocx, escapeXml, type DocxMeta } from './render/docx.js';
export { buildPdf, type PdfMeta } from './render/pdf.js';
export { createZip, crc32, type ZipEntry } from './util/zip.js';
export { renderAcr, buildOpenAcr, type AcrRenderOptions } from './render/acr.js';
export { renderBurden, reassessmentDate, type BurdenRenderOptions } from './render/burden.js';
export { renderTrace, type TraceRenderOptions } from './render/trace.js';

import type { ConformanceModel, EaaConfig, RenderedArtifact, RenderOptions } from './types.js';
import type { Pack } from './packs/pack.js';
import { renderStatement } from './render/statement.js';
import { renderAcr, type AcrRenderOptions } from './render/acr.js';
import { renderBurden } from './render/burden.js';
import { renderTrace } from './render/trace.js';
import { renderBinary as renderBinaryArtifact } from './render/binary.js';
import { A11yStatementError, DOCS_BASE } from './util/errors.js';

/** One entry point over all artifact renderers (FR-API-1). */
export function renderArtifact(
  conformance: ConformanceModel,
  config: EaaConfig,
  pack: Pack | undefined,
  opts: RenderOptions
): RenderedArtifact {
  if (opts.format === 'docx' || opts.format === 'pdf') {
    return renderBinaryArtifact(conformance, config, pack, {
      kind: opts.kind,
      format: opts.format,
      lang: opts.lang ?? pack?.meta.defaultLanguage ?? 'en',
      reviewedBy: opts.reviewedBy,
      reviewedOn: opts.reviewedOn,
    });
  }
  switch (opts.kind) {
    case 'statement': {
      if (!pack) {
        throw new A11yStatementError({
          what: 'Rendering a statement requires a jurisdiction pack.',
          fix: 'Pass a pack loaded with loadPack(), or use the CLI which resolves packs automatically.',
          docs: `${DOCS_BASE}/packs.md`,
        });
      }
      if (opts.format !== 'html' && opts.format !== 'md') {
        throw new A11yStatementError({
          what: `Statement format "${opts.format}" is not supported.`,
          fix: 'Use --format html or --format md.',
          docs: `${DOCS_BASE}/artifacts.md`,
        });
      }
      return renderStatement(conformance, config, pack, {
        lang: opts.lang,
        format: opts.format,
        reviewedBy: opts.reviewedBy,
        reviewedOn: opts.reviewedOn,
      });
    }
    case 'acr':
      return renderAcr(conformance, config, {
        format: opts.format as AcrRenderOptions['format'],
        lang: opts.lang,
        reviewedBy: opts.reviewedBy,
        reviewedOn: opts.reviewedOn,
      });
    case 'burden': {
      if (opts.format !== 'html' && opts.format !== 'md') {
        throw new A11yStatementError({
          what: `Burden worksheet format "${opts.format}" is not supported.`,
          fix: 'Use --format html or --format md.',
          docs: `${DOCS_BASE}/artifacts.md`,
        });
      }
      return renderBurden(config, {
        format: opts.format,
        lang: opts.lang,
        reviewedBy: opts.reviewedBy,
        reviewedOn: opts.reviewedOn,
      });
    }
    case 'trace': {
      if (opts.format !== 'html' && opts.format !== 'md' && opts.format !== 'json') {
        throw new A11yStatementError({
          what: `Trace format "${opts.format}" is not supported.`,
          fix: 'Use --format html, md or json.',
          docs: `${DOCS_BASE}/artifacts.md`,
        });
      }
      return renderTrace(conformance, config, { format: opts.format, lang: opts.lang });
    }
  }
}
