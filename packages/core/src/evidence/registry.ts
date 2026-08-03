import { readFileSync } from 'node:fs';
import type { EvidenceFile, EvidenceModel, ManualEntry } from '../types.js';
import { A11yStatementError, DOCS_BASE } from '../util/errors.js';
import { sortedUnique } from '../util/stable.js';
import { axeReader } from './readers/axe.js';
import { pa11yReader } from './readers/pa11y.js';
import { lighthouseReader } from './readers/lighthouse.js';
import { parseManualChecklist } from './manual.js';

/**
 * The pluggable ingestion interface (FR-ING-6). A new format — Playwright
 * ariaSnapshot, WAVE, IBM Equal Access — is one self-contained module
 * implementing this interface plus a fixture; see docs/writing-a-reader.md
 * and `accessibility-statement contrib scaffold-reader`.
 */
export interface EvidenceReader {
  /** Short id, used as `Finding.source` and in traces. */
  name: string;
  /** Human-readable format label for error messages and docs. */
  formatLabel: string;
  /** Return true if the parsed JSON is this reader's format. */
  detect(parsed: unknown, path: string): boolean;
  /** Convert the parsed document into the canonical evidence file. */
  read(parsed: unknown, path: string): EvidenceFile;
}

const builtinReaders: EvidenceReader[] = [axeReader, pa11yReader, lighthouseReader];

/** All registered readers, built-ins first. */
export function getReaders(extra: EvidenceReader[] = []): EvidenceReader[] {
  return [...builtinReaders, ...extra];
}

/** Parse one evidence document (already read from disk). */
export function readEvidenceContent(
  content: string,
  path: string,
  extraReaders: EvidenceReader[] = []
): EvidenceFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw unknownFormatError(path, extraReaders, 'The file is not valid JSON.');
  }
  for (const reader of getReaders(extraReaders)) {
    if (reader.detect(parsed, path)) return reader.read(parsed, path);
  }
  throw unknownFormatError(path, extraReaders);
}

function unknownFormatError(
  path: string,
  extraReaders: EvidenceReader[],
  why?: string
): A11yStatementError {
  const formats = getReaders(extraReaders)
    .map((r) => `  - ${r.formatLabel}`)
    .join('\n');
  return new A11yStatementError({
    what: `Could not recognise the evidence format of ${path}.`,
    why: why ?? 'It parses as JSON but matches none of the supported report shapes (accessibility-statement never guesses).',
    fix: `Supported formats:\n${formats}\nManual checklists (manual.yaml) are configured via evidence.manual, not evidence.paths.`,
    docs: `${DOCS_BASE}/evidence-formats.md`,
  });
}

export interface LoadEvidenceOptions {
  /** Additional readers (FR-ING-6). */
  readers?: EvidenceReader[];
  /** Path to a manual.yaml checklist. */
  manualPath?: string;
}

/**
 * Load evidence files from disk and merge into the canonical model
 * (FR-ING-4): multiple pages/routes/files, per-URL provenance retained.
 */
export function loadEvidence(paths: string[], opts: LoadEvidenceOptions = {}): EvidenceModel {
  const files: EvidenceFile[] = [...paths].sort().map((p) => {
    let content: string;
    try {
      content = readFileSync(p, 'utf8');
    } catch (e) {
      throw new A11yStatementError({
        what: `Cannot read evidence file ${p}.`,
        why: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'The file does not exist.' : (e as Error).message,
        fix: 'Check evidence.paths in a11y-statement.config.yaml.',
        docs: `${DOCS_BASE}/evidence-formats.md`,
      });
    }
    return readEvidenceContent(content, p, opts.readers ?? []);
  });

  let manual: ManualEntry[] = [];
  if (opts.manualPath) {
    let content: string;
    try {
      content = readFileSync(opts.manualPath, 'utf8');
    } catch (e) {
      throw new A11yStatementError({
        what: `Cannot read manual checklist ${opts.manualPath}.`,
        why: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'The file does not exist.' : (e as Error).message,
        fix: 'Check evidence.manual in a11y-statement.config.yaml, or generate a template with: accessibility-statement init',
        docs: `${DOCS_BASE}/manual-checklist.md`,
      });
    }
    manual = parseManualChecklist(content, opts.manualPath);
  }

  return mergeEvidence(files, manual);
}

/** Merge parsed evidence files + manual entries into one model. */
export function mergeEvidence(files: EvidenceFile[], manual: ManualEntry[]): EvidenceModel {
  return {
    files,
    manual: [...manual].sort((a, b) => a.criterion.localeCompare(b.criterion)),
    urls: sortedUnique(files.flatMap((f) => f.urls)),
  };
}
