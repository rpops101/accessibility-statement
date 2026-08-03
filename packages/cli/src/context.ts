import { dirname, isAbsolute, resolve } from 'node:path';
import {
  computeConformance,
  loadConfig,
  loadEvidence,
  type ConformanceModel,
  type EaaConfig,
  type EvidenceModel,
} from '@eaa-kit/core';
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
  const configPath = resolve(flagString(args.flags, 'config') ?? 'eaa.config.yaml');
  const configDir = dirname(configPath);
  const config = loadConfig(configPath);

  const evidencePaths = expandEvidencePaths(config.evidence.paths, configDir);
  const manualPath = config.evidence.manual
    ? isAbsolute(config.evidence.manual)
      ? config.evidence.manual
      : resolve(configDir, config.evidence.manual)
    : undefined;

  const evidence = loadEvidence(evidencePaths, { manualPath });
  const conformance = computeConformance(evidence, {
    wcagVersion: config.standards?.wcag,
    enVersion: config.standards?.en301549,
  });
  return { configPath, configDir, config, evidence, conformance, evidencePaths };
}
