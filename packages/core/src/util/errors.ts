/**
 * Actionable errors (NFR-8): what failed, why, what to do, docs link.
 * The CLI formats these without a stack trace.
 */
export class EaaKitError extends Error {
  readonly what: string;
  readonly why?: string;
  readonly fix?: string;
  readonly docs?: string;

  constructor(opts: { what: string; why?: string; fix?: string; docs?: string }) {
    super(opts.what);
    this.name = 'EaaKitError';
    this.what = opts.what;
    this.why = opts.why;
    this.fix = opts.fix;
    this.docs = opts.docs;
  }

  /** Multi-line human-readable rendering used by the CLI. */
  format(): string {
    const lines = [`Error: ${this.what}`];
    if (this.why) lines.push(`  Why:  ${this.why}`);
    if (this.fix) lines.push(`  Fix:  ${this.fix}`);
    if (this.docs) lines.push(`  Docs: ${this.docs}`);
    return lines.join('\n');
  }
}

export const DOCS_BASE = 'https://github.com/eaa-kit/eaa-kit/blob/main/docs';
