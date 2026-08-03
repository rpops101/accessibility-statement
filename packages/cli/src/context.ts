import { dirname, isAbsolute, resolve } from 'node:path';
import {
  computeConformance,
  loadConfig,
  loadEvidence,
  type ConformanceModel,
  type EaaConfig,
  type EvidenceModel,
} from '@accessibility-statement/core';
import { expandEvidencePaths } from './resolve.js';
import { flagString, type ParsedArgs } from './args.js';

export interface ProjectContext {
  configPath: string;
  configDir: string;
  config: EaaConfig;
  evidence: EvidenceModel;
  conformance: ConformanceModel;
  evidencePaths: string[];
}

/** Load config + evidence + conformance — the shared prologue of render/check. */
export function loadProject(args: ParsedArgs): ProjectContext {
  const configPath = resolve(flagString(args.flags, 'config') ?? 'a11y-statement.config.yaml');
  const configDir = dirname(configPath);
  const config = loadConfig(configPath);

  const evidencePaths = expandEvidencePaths(config.evidence.paths, configDir);
  const manualPath = config.evidence.manual
    ? isAbsolute(config.evidence.manual)
      ? config.evidence.manual
      : resolve(configDir, config.evidence.manual)
    : undefined;

  // Paths are recorded relative to the project so trace output is the
  // same on every machine (FR-ART-5).
  const evidence = loadEvidence(evidencePaths, { manualPath, basePath: configDir });
  const conformance = computeConformance(evidence, {
    wcagVersion: config.standards?.wcag,
    enVersion: config.standards?.en301549,
  });
  return { configPath, configDir, config, evidence, conformance, evidencePaths };
}
