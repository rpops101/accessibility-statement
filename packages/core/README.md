# @accessibility-statement/core

The engine behind [accessibility-statement](https://github.com/rpops101/accessibility-statement): turn
accessibility test evidence into the artifacts the European Accessibility
Act requires.

**One runtime dependency.** No network access, ever. Deterministic output.

**[Try it in your browser →](https://rpops101.github.io/accessibility-statement/generator/)** — no install, nothing uploaded.

```bash
npm install @accessibility-statement/core @accessibility-statement/packs
```

## Use

```ts
import {
  loadEvidence,
  computeConformance,
  loadPack,
  renderArtifact,
  loadConfig,
} from '@accessibility-statement/core';

const config = loadConfig('a11y-statement.config.yaml');

// 1. Ingest axe-core / pa11y / Lighthouse JSON plus a manual checklist.
const evidence = loadEvidence(['axe.json'], { manualPath: 'manual.yaml' });

// 2. Compute per-criterion conformance, fully traceable.
const conformance = computeConformance(evidence);
conformance.summary.compliance; // 'full' | 'partial' | 'non-compliant'

// 3. Render.
const pack = loadPack('node_modules/@accessibility-statement/packs/packs/de');
const statement = renderArtifact(conformance, config, pack, {
  kind: 'statement',   // 'statement' | 'acr' | 'burden' | 'trace'
  format: 'html',      // 'html' | 'md' | 'openacr' | 'json'
  lang: 'de',
});
console.log(statement.content);
```

## Why you might depend on this

If you build accessibility tooling — a Playwright reporter, a Storybook
addon, a CI dashboard — your users eventually need the regulatory document,
not just the violation list. This gives you that without adding a
dependency tree: one runtime dependency (`yaml`), no network, no telemetry.

## What it does

| | |
| --- | --- |
| **Ingest** | axe-core, pa11y, pa11y-ci, Lighthouse JSON; manual checklists; pluggable readers for anything else |
| **Map** | Tool rules → WCAG 2.1/2.2 success criteria → EN 301 549 clauses. Version-pluggable, shipped as data |
| **Compute** | Per-criterion conformance with documented precedence; conflicts surfaced, never silently resolved |
| **Render** | Accessibility statement (per jurisdiction), ACR/VPAT 2.5 as OpenACR, Article 14 burden worksheet, traceability report |

## Determinism

Identical inputs produce byte-identical outputs: dates come from
configuration rather than the clock, keys are sorted, ids are stable. CI
renders the full corpus on Linux, macOS and Windows and compares hashes.

## Main exports

`loadEvidence` · `mergeEvidence` · `readEvidenceContent` · `computeConformance` ·
`renderArtifact` · `renderStatement` · `renderAcr` · `renderBurden` · `renderTrace` ·
`buildOpenAcr` · `loadConfig` · `parseConfig` · `loadPack` · `validatePackDir` ·
`buildLock` · `diffLock` · `getWcagStandard` · `getEnStandard` · `manualChecklistTemplate`

Full TypeScript types are included. See
[the documentation](https://github.com/rpops101/accessibility-statement/tree/main/docs).

## Dependencies

One, justified in
[DEPENDENCIES.md](https://github.com/rpops101/accessibility-statement/blob/main/packages/core/DEPENDENCIES.md).
The budget is five and a CI job enforces it.

## Licence

MIT.

---

*Generated artifacts are drafts for human review and do not constitute
legal advice.*
