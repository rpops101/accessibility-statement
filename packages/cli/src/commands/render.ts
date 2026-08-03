import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  BINARY_FORMATS,
  EaaKitError,
  DOCS_BASE,
  renderArtifact,
  type ArtifactFormat,
  type ArtifactKind,
} from '@eaa-kit/core';
import { flagBool, flagString, type ParsedArgs } from '../args.js';
import { loadProject } from '../context.js';
import { resolvePack, resolvePacksDir } from '../resolve.js';

const KINDS: ArtifactKind[] = ['statement', 'acr', 'burden', 'trace'];

const DEFAULT_FORMAT: Record<ArtifactKind, ArtifactFormat> = {
  statement: 'html',
  acr: 'openacr',
  burden: 'html',
  trace: 'md',
};

/** `eaa-kit render statement|acr|burden|trace` (FR-CLI-2). */
export function renderCommand(args: ParsedArgs): number {
  const kind = args.positionals[0] as ArtifactKind | undefined;
  if (!kind || !KINDS.includes(kind)) {
    throw new EaaKitError({
      what: kind ? `Unknown artifact "${kind}".` : 'render needs an artifact to produce.',
      fix: `Use one of: ${KINDS.join(' | ')}. Example: eaa-kit render statement --jurisdiction de --lang de`,
      docs: `${DOCS_BASE}/artifacts.md`,
    });
  }

  const project = loadProject(args);
  const formatName: string = flagString(args.flags, 'format') ?? DEFAULT_FORMAT[kind];
  const format = formatName as ArtifactFormat;

  const outPathFlag = flagString(args.flags, 'out');
  if (BINARY_FORMATS.has(formatName) && !outPathFlag) {
    throw new EaaKitError({
      what: `"${formatName}" is a binary format and cannot be written to the terminal.`,
      fix: `Use --out, for example: eaa-kit render ${kind} --format ${formatName} --out ${kind}.${formatName}`,
      docs: `${DOCS_BASE}/artifacts.md`,
    });
  }

  const jurisdiction = flagString(args.flags, 'jurisdiction') ?? project.config.jurisdiction;
  const pack =
    kind === 'statement'
      ? resolvePack(resolvePacksDir(flagString(args.flags, 'packs-dir')), jurisdiction)
      : undefined;

  const artifact = renderArtifact(project.conformance, project.config, pack, {
    kind,
    format,
    lang: flagString(args.flags, 'lang') ?? project.config.languages[0],
    reviewedBy: flagString(args.flags, 'reviewed-by'),
    reviewedOn: flagString(args.flags, 'reviewed-on'),
  });

  const outPath = outPathFlag;
  if (outPath) {
    const abs = resolve(outPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, artifact.bytes ?? artifact.content);
    if (flagBool(args.flags, 'json')) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: artifact.kind,
            format: artifact.format,
            lang: artifact.lang,
            path: abs,
            compliance: project.conformance.summary.compliance,
            totals: project.conformance.summary.totals,
          },
          null,
          2
        ) + '\n'
      );
    } else {
      process.stdout.write(`Wrote ${abs}\n`);
    }
    return 0;
  }

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(
      JSON.stringify(
        {
          kind: artifact.kind,
          format: artifact.format,
          lang: artifact.lang,
          filenameHint: artifact.filenameHint,
          content: artifact.content,
          compliance: project.conformance.summary.compliance,
          totals: project.conformance.summary.totals,
        },
        null,
        2
      ) + '\n'
    );
    return 0;
  }

  process.stdout.write(artifact.content);
  if (!artifact.content.endsWith('\n')) process.stdout.write('\n');
  return 0;
}

/** `eaa-kit render-all` helper used by the GitHub Action. */
export function renderAllCommand(args: ParsedArgs): number {
  const outDir = resolve(flagString(args.flags, 'out-dir') ?? 'eaa-artifacts');
  const project = loadProject(args);
  const jurisdiction = flagString(args.flags, 'jurisdiction') ?? project.config.jurisdiction;
  const packsDir = resolvePacksDir(flagString(args.flags, 'packs-dir'));
  const pack = resolvePack(packsDir, jurisdiction);
  const lang = flagString(args.flags, 'lang') ?? project.config.languages[0];
  const reviewedBy = flagString(args.flags, 'reviewed-by');
  const reviewedOn = flagString(args.flags, 'reviewed-on');

  const targets: Array<{ kind: ArtifactKind; format: ArtifactFormat }> = [
    { kind: 'statement', format: 'html' },
    { kind: 'statement', format: 'md' },
    { kind: 'acr', format: 'openacr' },
    { kind: 'acr', format: 'html' },
    { kind: 'burden', format: 'html' },
    { kind: 'trace', format: 'md' },
    { kind: 'trace', format: 'json' },
    { kind: 'statement', format: 'docx' },
    { kind: 'statement', format: 'pdf' },
    { kind: 'burden', format: 'docx' },
  ];

  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  for (const target of targets) {
    const artifact = renderArtifact(project.conformance, project.config, pack, {
      ...target,
      lang,
      reviewedBy,
      reviewedOn,
    });
    const path = resolve(outDir, artifact.filenameHint);
    writeFileSync(path, artifact.bytes ?? artifact.content);
    written.push(path);
  }

  if (flagBool(args.flags, 'json')) {
    process.stdout.write(
      JSON.stringify(
        { outDir, files: written, compliance: project.conformance.summary.compliance },
        null,
        2
      ) + '\n'
    );
  } else {
    for (const path of written) process.stdout.write(`Wrote ${path}\n`);
  }
  return 0;
}
