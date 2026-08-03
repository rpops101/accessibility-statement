/**
 * Shared types for the accessibility-statement engine.
 *
 * The pipeline: evidence files → canonical EvidenceModel → ConformanceModel
 * (per WCAG criterion / EN 301 549 clause, fully traceable) → rendered artifacts.
 */

/** Outcome of a single tool finding for some rule on some URL. */
export type FindingOutcome = 'fail' | 'pass' | 'incomplete' | 'inapplicable';

/** Status of a WCAG success criterion after evidence merge. */
export type CriterionStatus =
  | 'pass'
  | 'fail'
  | 'partial'
  | 'not-applicable'
  | 'not-evaluated';

/** Statuses allowed in the manual checklist. */
export type ManualStatus = CriterionStatus;

/** One finding extracted from a tool report. */
export interface Finding {
  /** Tool rule identifier, e.g. axe `image-alt`. */
  ruleId: string;
  /** Which reader produced this finding (`axe`, `pa11y`, `lighthouse`, ...). */
  source: string;
  outcome: FindingOutcome;
  /** WCAG success criterion ids this rule maps to, e.g. `["1.1.1"]`. Empty = best practice / unmapped. */
  criteria: string[];
  /** Page or route the finding applies to, when known. */
  url?: string;
  /** CSS selectors / targets of affected nodes. */
  selectors: string[];
  /** Human-readable description from the tool. */
  message?: string;
  /** Tool-reported impact/severity, verbatim. */
  impact?: string;
}

/** One parsed evidence file, with provenance. */
export interface EvidenceFile {
  /** Path as given by the user (kept for traceability). */
  path: string;
  /** Reader that parsed it. */
  reader: string;
  /** Tool name/version as self-reported by the file, if present. */
  tool?: string;
  toolVersion?: string;
  /** URLs covered by this file. */
  urls: string[];
  findings: Finding[];
}

/** One entry of the manual checklist (`manual.yaml`). */
export interface ManualEntry {
  criterion: string;
  status: ManualStatus;
  evidence?: string;
  /** Who performed the manual evaluation, free text. */
  evaluatedBy?: string;
}

/** Canonical, merged evidence model for a project. */
export interface EvidenceModel {
  files: EvidenceFile[];
  manual: ManualEntry[];
  /** Union of URLs across files, sorted. */
  urls: string[];
}

/** A WCAG success criterion as shipped in standards data. */
export interface WcagCriterion {
  id: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  /** How far automated tools can judge this criterion. */
  automation: 'full' | 'partial' | 'none';
  /** Guidance shown in the manual checklist template. */
  manualGuidance?: string;
}

export interface WcagStandard {
  id: string; // e.g. "wcag-2.1"
  version: string; // "2.1"
  criteria: WcagCriterion[];
}

/** An EN 301 549 clause (web clauses in chapter 9 mirror WCAG numbering). */
export interface EnClause {
  id: string; // e.g. "9.1.1.1"
  title: string;
  chapter: number;
  /** WCAG criterion this clause corresponds to, if any. */
  wcag?: string;
}

export interface EnStandard {
  id: string; // e.g. "en301549-3.2.1"
  version: string; // "3.2.1"
  /** WCAG version the standard incorporates. */
  wcagVersion: string;
  clauses: EnClause[];
  /**
   * Chapters reserved for future (non-web) coverage — kept in the schema so
   * extending to clauses 5–8 and 12–13 is not a breaking change (FR-MAP-5).
   */
  reservedChapters: number[];
}

/** How a criterion's status was decided, for the trace artifact. */
export interface TraceEntry {
  source: string; // reader name or 'manual'
  file?: string; // evidence file path
  ruleId?: string;
  outcome: FindingOutcome | ManualStatus;
  urls: string[];
  selectors: string[];
  message?: string;
}

/** A surfaced (never silently resolved) evidence conflict. */
export interface Conflict {
  criterion: string;
  description: string;
  /** The sides of the conflict. */
  entries: TraceEntry[];
}

export interface CriterionResult {
  criterion: WcagCriterion;
  /** Corresponding EN 301 549 clause id, when the standard maps it. */
  clause?: string;
  clauseTitle?: string;
  status: CriterionStatus;
  /** Why: ordered trace of every piece of evidence considered. */
  trace: TraceEntry[];
  conflicts: Conflict[];
  /** The precedence rule that decided the status. */
  decidedBy: 'manual' | 'automated-fail' | 'automated-pass' | 'default';
}

export type ComplianceLevel = 'full' | 'partial' | 'non-compliant';

export interface ConformanceSummary {
  compliance: ComplianceLevel;
  totals: Record<CriterionStatus, number>;
  criteriaCount: number;
}

export interface ConformanceModel {
  wcagVersion: string;
  enVersion: string;
  results: CriterionResult[];
  summary: ConformanceSummary;
  /** Findings that mapped to no criterion (best-practice rules etc.). */
  unmappedFindings: Finding[];
  urls: string[];
}

/** Project configuration (a11y-statement.config.yaml). */
export interface EaaConfig {
  organisation: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    /** Employee headcount — drives the micro-enterprise check. */
    employees?: number;
    /** Annual turnover in EUR — drives the micro-enterprise check. */
    turnoverEUR?: number;
  };
  product: {
    name: string;
    /** Description of the scope covered by the statement. */
    scope?: string;
    urls?: string[];
  };
  jurisdiction: string; // ISO 3166-1 alpha-2, lowercase (or 'eu')
  languages: string[]; // BCP 47 primary tags, e.g. ["de", "en"]
  evidence: {
    paths: string[]; // globs or files
    manual?: string; // manual.yaml path
  };
  standards?: {
    wcag?: string; // default "2.1"
    en301549?: string; // default "3.2.1"
  };
  /** All dates are explicit — never wall-clock (FR-ART-5). ISO 8601. */
  dates: {
    preparation: string;
    lastReview?: string;
    /** Date of the disproportionate-burden assessment, if one was made. */
    burdenAssessment?: string;
  };
  /** Method used to prepare the statement (self-assessment / third party). */
  evaluationMethod?: string;
  feedback?: {
    email?: string;
    url?: string;
    phone?: string;
  };
  review?: {
    reviewedBy?: string;
    reviewedOn?: string;
  };
  burden?: BurdenConfig;
}

/** Inputs to the Article 14 disproportionate-burden worksheet. */
export interface BurdenConfig {
  claimed: boolean;
  /** Criteria or feature scopes excluded under the claim. */
  exclusions?: Array<{
    scope: string;
    reason?: string;
    criteria?: string[];
  }>;
  costBenefit?: {
    estimatedCost?: string;
    organisationBenefit?: string;
    disabledUserImpact?: string;
    frequencyOfUse?: string;
  };
  notes?: string;
}

export type ArtifactKind = 'statement' | 'acr' | 'burden' | 'trace';
export type ArtifactFormat = 'html' | 'md' | 'json' | 'yaml' | 'openacr' | 'docx' | 'pdf';

/** Formats whose payload is bytes rather than text. */
export const BINARY_FORMATS: ReadonlySet<string> = new Set(['docx', 'pdf']);

export interface RenderOptions {
  kind: ArtifactKind;
  format: ArtifactFormat;
  lang?: string;
  /** Overrides config.review — removing the draft watermark requires both fields. */
  reviewedBy?: string;
  reviewedOn?: string;
}

export interface RenderedArtifact {
  kind: ArtifactKind;
  format: ArtifactFormat;
  lang: string;
  filenameHint: string;
  /**
   * Text payload. For binary formats (docx, pdf) this is the Latin-1
   * decoding of `bytes` and must not be written to disk directly — write
   * `bytes` instead. `isBinary` distinguishes the two.
   */
  content: string;
  /** Present for docx and pdf. */
  bytes?: Uint8Array;
  isBinary?: boolean;
}
