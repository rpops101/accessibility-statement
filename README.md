# eaa-kit

**Generate the EU accessibility statement the European Accessibility Act requires — from the axe results you already have.**

[![CI](https://github.com/rpops101/eaa-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/rpops101/eaa-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/eaa-kit.svg)](https://www.npmjs.com/package/eaa-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Four commands turn an axe-core report into a German accessibility statement: the terminal on the left runs eaa-kit init, render statement and check; the document on the right is the resulting statement.html, carrying a draft watermark, a partial-compliance status, and WCAG criteria 1.1.1 and 1.4.3 listed against EN 301 549 clauses 9.1.1.1 and 9.1.4.3.](docs/assets/demo.svg)

The European Accessibility Act has been enforceable since **28 June 2025**, with the next deadline on **28 June 2027**. It requires documents — an accessibility statement in your country's format and language, a conformance report, and a documented disproportionate-burden assessment if you claim one. Today those are produced by consultancies and Word templates.

`eaa-kit` compiles them from evidence you already produce.

```bash
npx eaa-kit init          # answer a few questions, or press Enter through them
npx eaa-kit render statement --jurisdiction de --lang de --out statement.html
```

That is the whole flow. It reads your axe-core, pa11y or Lighthouse JSON plus a manual checklist, and writes the artifacts.

**No network access, ever.** No signup, no telemetry, no update checks, no fetching templates. A compliance tool that phones home is a compliance problem.

---

## What you get

| Artifact | What it is | Formats |
| --- | --- | --- |
| **Accessibility statement** | The statement required by your member state, in its format and language, listing non-accessible content with EN 301 549 clause references, feedback route and enforcement body | HTML, Markdown |
| **ACR / VPAT 2.5** | Conformance report in the machine-readable **OpenACR** format, with HTML and Markdown views | OpenACR YAML/JSON, HTML, Markdown |
| **Disproportionate-burden worksheet** | Article 14 assessment: cost–benefit prompts, micro-enterprise check, scope exclusions, and the auto-computed 5-year reassessment date | HTML, Markdown |
| **Traceability report** | Every conclusion traced: criterion → EN clause → evidence file → rule → selector/URL | Markdown, HTML, JSON |

Every artifact carries a **draft watermark and a legal disclaimer** until a named person signs off with `--reviewed-by` and `--reviewed-on`. eaa-kit produces drafts for human review; it does not give legal advice.

## What it is not

A scanner. axe-core owns that (242M downloads a month) and eaa-kit never competes with it — it *consumes* its output. It is also not a monitoring platform, a consultancy replacement, or a source of legal advice.

---

## Five minutes, start to finish

```console
$ ls
axe.json

$ npx eaa-kit init
eaa-kit init — nothing leaves this machine.

Organisation name [My Organisation]: Example GmbH
Product / service name [My Website]: Example Shop
Jurisdiction (de, es, eu, fr, ie, it) [eu]: de
Statement language(s), comma-separated [en]: de
Evidence file(s) or directory, comma-separated [axe.json]:
Preparation date (YYYY-MM-DD) [2026-01-01]: 2026-08-03
Accessibility feedback e-mail []: barrierefreiheit@example.de

Wrote eaa.config.yaml
Wrote manual.yaml (manual checklist template — the criteria automation cannot judge)

Next: eaa-kit render statement --jurisdiction de --lang de

$ npx eaa-kit render statement --jurisdiction de --lang de --out statement.html
Wrote statement.html
```

`manual.yaml` is where the honesty lives: it lists every WCAG 2.1 AA criterion automation cannot fully judge (captions, focus order, error suggestions…), with guidance on how to check each one. Criteria you leave unevaluated are reported as unevaluated — the statement never claims more than the evidence supports.

---

## Keeping it true: `check` in CI

A statement is only accurate the day you generate it. `eaa-kit check` compares current conformance against a committed baseline and fails the build when a criterion regresses.

```console
$ eaa-kit check
Regressions:
  1.1.1: pass → fail

1 criterion regression against eaa.lock.json.
Fix the underlying issues, or record the new baseline deliberately with: eaa-kit check --update
```

With the first-party GitHub Action:

```yaml
- uses: rpops101/eaa-kit/action@v1   # use @main until v1 is tagged
  with:
    jurisdiction: de
    lang: de
```

It runs `check`, uploads the rendered artifacts, and comments the conformance delta on the pull request. Recipes for [GitLab CI and other runners](docs/ci.md) and a [pre-commit hook](docs/ci.md#pre-commit) are documented too.

---

## Jurisdiction support matrix

Each member state words its statement differently, in its own language, citing its own law and enforcement body. **No single maintainer can own 27 of those.** Each one is a self-contained directory of data that a native speaker can complete in an evening — [and that is exactly the contribution we are asking for](CONTRIBUTING.md).

**Quality scale:** 🥉 Bronze = statement + one language · 🥈 Silver = + all official languages + verified enforcement body · 🥇 Gold = + DOCX template + second native-speaker review.

| | Country | Status | Languages | Enforcement body |
| --- | --- | --- | --- | --- |
| 🇪🇺 | EU (generic model) | 🥈 Silver | en | (per member state) |
| 🇩🇪 | Germany | 🥈 Silver | de, en | MLBF |
| 🇫🇷 | France | 🥈 Silver | fr, en | DGCCRF |
| 🇪🇸 | Spain | 🥈 Silver | es, en | Dirección General de Consumo |
| 🇮🇹 | Italy | 🥈 Silver | it, en | AgID |
| 🇮🇪 | Ireland | 🥈 Silver | en, ga | CCPC |
| 🇦🇹 | Austria | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇧🇪 | Belgium | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇧🇬 | Bulgaria | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇭🇷 | Croatia | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇨🇾 | Cyprus | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇨🇿 | Czechia | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇩🇰 | Denmark | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇪🇪 | Estonia | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇫🇮 | Finland | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇬🇷 | Greece | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇭🇺 | Hungary | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇱🇻 | Latvia | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇱🇹 | Lithuania | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇱🇺 | Luxembourg | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇲🇹 | Malta | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇳🇱 | Netherlands | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇵🇱 | Poland | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇵🇹 | Portugal | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇷🇴 | Romania | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇸🇰 | Slovakia | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇸🇮 | Slovenia | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇸🇪 | Sweden | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇳🇴 | Norway (EEA) | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇮🇸 | Iceland (EEA) | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇱🇮 | Liechtenstein (EEA) | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |
| 🇬🇧 | United Kingdom | — | | [Claim it](../../issues?q=is%3Aissue+is%3Aopen+label%3Apack) |

**The empty cells are the invitation.** One command starts your country's pack:

```bash
npx eaa-kit contrib scaffold-pack --country pt
```

You get a complete skeleton — pack metadata with TODOs, a wired test fixture, a snapshot harness. Fill in your country's law, its enforcement body and the translation; `eaa-kit validate-pack` tells you when you are done. **You never need to read the engine.**

---

## Using it as a library

The CLI is a thin wrapper over `@eaa-kit/core`, so testing tools can generate artifacts directly:

```ts
import {
  loadEvidence,
  computeConformance,
  loadPack,
  renderArtifact,
} from '@eaa-kit/core';

const evidence = loadEvidence(['axe.json'], { manualPath: 'manual.yaml' });
const conformance = computeConformance(evidence);       // per-criterion, traceable
const pack = loadPack('node_modules/@eaa-kit/packs/packs/de');
const statement = renderArtifact(conformance, config, pack, {
  kind: 'statement',
  format: 'html',
  lang: 'de',
});
```

| Package | What it holds |
| --- | --- |
| [`@eaa-kit/core`](packages/core) | The engine: readers, mapping, conformance, renderers. **One runtime dependency** ([justified here](packages/core/DEPENDENCIES.md)) |
| [`@eaa-kit/packs`](packages/packs) | Jurisdiction data. Versioned separately so translations ship without touching the engine |
| [`eaa-kit`](packages/cli) | The CLI |

---

## Design commitments

These are constraints, not aspirations. Each is enforced by a test.

- **Deterministic.** Identical inputs produce byte-identical outputs. No wall-clock timestamps (dates come from config or `--date`), stable key ordering, stable IDs. This is what makes `git diff` on a statement meaningful and CI mode possible.
- **Offline.** No network calls at runtime. Ever.
- **Data, not code.** Standard mappings and jurisdiction packs are YAML. Adding EN 301 549 v4.1.1 when it publishes in 2026 is a data pull request, not a rewrite.
- **Logic-less templates.** Pack templates have no expression evaluation, so a contributed pack cannot execute code. Packs are data.
- **It passes its own test.** Every HTML artifact eaa-kit generates is checked with axe-core in CI. A tool that emits inaccessible accessibility documents has no standing.
- **Errors that help.** What failed, why, what to do, and a docs link. No stack traces at users.

## Standards

WCAG 2.1 and 2.2 (levels A and AA) and EN 301 549 v3.2.1 ship today; version selection is configuration. Regulatory basis: Directive (EU) 2019/882 (EAA), Directive (EU) 2016/2102, Commission Implementing Decision (EU) 2018/1523 (the model statement), ITI VPAT 2.5 and the GSA OpenACR schema.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). The smallest useful contribution is a Bronze jurisdiction pack: **two files, about one evening, no engine knowledge required.** Evidence readers for new tools, CI recipes and UI translations are similarly self-contained. Every first-time contributor gets a human reply within 24 hours ([MAINTAINERS.md](MAINTAINERS.md)).

## Licence

MIT. See [LICENSE](LICENSE).

---

*eaa-kit generates drafts for human review. It does not constitute legal advice. Have a responsible person review every artifact before you publish it.*
