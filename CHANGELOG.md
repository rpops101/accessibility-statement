# Changelog

All notable changes are recorded here. This project follows [semantic
versioning](https://semver.org/).

Two project-specific rules:

- **Pack data changes are minor releases.** A translation should reach users
  in days, not at a quarterly release.
- **Any change to rendered output is a minor release at minimum**, even when
  the code change looks trivial. Someone's committed artifacts will change,
  and their `git diff` should point at a version bump.

## [Unreleased]

### Added

- **Evidence ingestion** for axe-core (≥ 4.x), pa11y, pa11y-ci and Lighthouse
  JSON, merging across pages with per-URL provenance retained. Unknown
  formats are refused with the list of supported ones rather than guessed at.
- **Manual checklist** (`manual.yaml`) covering criteria automation cannot
  judge, with a generated template enumerating every one of them and how to
  check it.
- **Mapping engine**: tool rule → WCAG success criterion → EN 301 549 clause,
  shipped as data. WCAG 2.1 and 2.2 and EN 301 549 v3.2.1 included; versions
  are selectable per project and new ones are data-only additions.
- **Conformance computation** with documented precedence (manual override >
  automated fail > automated pass > not-evaluated) and conflicts surfaced
  rather than silently resolved.
- **Artifacts**: EU accessibility statement (HTML, Markdown), ACR/VPAT 2.5 as
  OpenACR (YAML, JSON, HTML, Markdown), Article 14 disproportionate-burden
  worksheet with the five-year reassessment date, and a traceability report.
- **Draft watermark and legal disclaimer** on every artifact until a named
  reviewer signs off with both `--reviewed-by` and `--reviewed-on`.
- **Jurisdiction packs** for Germany, France, Spain, Italy and Ireland, plus
  a generic EU model pack, all at Silver quality.
- **CLI**: `init`, `render`, `render-all`, `check`, `validate-pack`, `packs`,
  `contrib scaffold-pack`, `contrib scaffold-reader`, with `--json` on every
  command.
- **CI regression mode**: `eaa-kit check` against a committed
  `eaa.lock.json`, with a first-party GitHub Action, GitLab CI recipe and
  pre-commit hook definitions.
- **Library API**: `@eaa-kit/core` with `loadEvidence`, `computeConformance`
  and `renderArtifact`, typed, with one runtime dependency.

### Guarantees established in this release

- Byte-identical output for identical inputs, verified across Linux, macOS
  and Windows in CI.
- No network access at runtime, verified by a CI job that stubs every
  network primitive and renders the full corpus.
- Generated HTML passes axe-core, checked in CI.
- At most five runtime dependencies in `@eaa-kit/core` (currently one),
  enforced by a CI budget check.
