/**
 * Browser entry point for the in-page generator.
 *
 * The whole engine runs client-side: evidence never leaves the visitor's
 * machine, because there is nowhere for it to go. That is not a policy we
 * promise to keep — it is a property of the architecture. `@accessibility-statement/core`
 * has one dependency and makes no network calls, so bundling it for the
 * browser needs nothing but stubs for the Node built-ins the CLI paths use.
 */
import {
  readEvidenceContent,
  computeConformance,
  renderStatement,
  renderAcr,
  renderBurden,
  renderTrace,
  renderBinary,
} from '@accessibility-statement/core';

// Injected at build time from the real pack directories, so the site can
// never drift from what the CLI produces.
import PACKS from 'virtual:packs';

/** Reassemble a Pack object from the embedded data, without the filesystem. */
function getPack(country) {
  const data = PACKS[country];
  if (!data) throw new Error(`No jurisdiction pack for "${country}".`);
  return {
    meta: data.meta,
    dir: `packs/${country}`,
    templates: data.templates,
    strings: data.strings,
    usesFallbackTemplates: data.usesFallbackTemplates,
  };
}

/**
 * Produce every artifact from one evidence file.
 * Returns { conformance, artifacts } or throws an actionable Error.
 */
function generate({ evidenceText, evidenceName, config, country, lang, kind, format }) {
  const file = readEvidenceContent(evidenceText, evidenceName || 'evidence.json');
  const evidence = {
    files: [file],
    manual: [],
    urls: file.urls,
  };
  const conformance = computeConformance(evidence);
  const pack = getPack(country);

  let artifact;
  if (format === 'pdf') {
    artifact = renderBinary(conformance, config, pack, { kind, format: 'pdf', lang });
  } else if (kind === 'statement') {
    artifact = renderStatement(conformance, config, pack, { lang, format });
  } else if (kind === 'acr') {
    artifact = renderAcr(conformance, config, { format, lang });
  } else if (kind === 'burden') {
    artifact = renderBurden(config, { format, lang });
  } else {
    artifact = renderTrace(conformance, config, { format, lang });
  }
  return { conformance, artifact, file };
}

globalThis.AccessibilityStatement = {
  generate,
  packs: PACKS,
  countries: Object.keys(PACKS).sort(),
};
