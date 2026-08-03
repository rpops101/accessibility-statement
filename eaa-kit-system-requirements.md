# System Requirements Specification — `eaa-kit` (working name)

**Open-source EU Accessibility Act conformance artifact generator**
Version 1.0 · 3 August 2026 · Prepared for O

---

## 0. Why this document is shaped the way it is

This is not a normal SRS. The software has two goals, and every requirement below is traceable to one of them:

- **G1 — Be genuinely useful:** turn accessibility test evidence into the regulatory artifacts the European Accessibility Act demands — artifacts currently produced only by consultancies and Word templates.
- **G2 — Qualify for Claude for Open Source:** reach **20+ unique external contributors with merged PRs within 12 months** (the community-builder track — the only build-shaped bar with a ~60% success rate given the right architecture), with 200k+ monthly downloads as the secondary target and an OpenSSF criticality score ≥ 0.4 as the long-tail bonus.

The single most important design decision in this document is **REQ-PACK-1: jurisdiction packs are the atomic contributor unit.** Twenty-seven EU member states each need their own accessibility-statement format, language, legal references and enforcement-body details. No solo maintainer can own all 27 — which is precisely the Home Assistant condition ("*we cannot build thousands of device integrations; I don't have tens of thousands of devices in my home*") that produces distributed contribution. A native speaker who needs the artifact for their own employer can ship a complete, testable, mergeable pack without ever touching the core engine.

Requirements are tagged **[MUST]** (v1.0 blocker), **[SHOULD]** (v1.x), **[COULD]** (post-launch), and each carries the goal it serves.

---

## 1. Product definition

**One-liner:** `npx eaa-kit` consumes your existing accessibility test output (axe-core, pa11y, Lighthouse) plus a manual checklist, and emits the legally required artifacts: an EU accessibility statement in your country's format and language, an ACR/VPAT 2.5 conformance report, and a documented disproportionate-burden worksheet.

**What it is:** a deterministic document generator — a compiler from evidence to regulatory artifact.
**What it is not:** a scanner (axe-core owns that, 242M downloads/month), a monitoring platform, a consultancy replacement, or a source of legal advice.

### 1.1 Users

| Persona | Situation | What they need |
|---|---|---|
| **P1 — EU web developer** | Employer sells services in the EU; EAA enforceable since 28 June 2025, next deadline 28 June 2027; legal asked for "the statement" | A statement in the right national format and language, generated from tests they already run, in CI |
| **P2 — Agency / freelancer** | Ships sites for many EU clients | Repeatable generation across projects; per-client config |
| **P3 — Compliance / legal officer** | Non-technical; owns the conformity file | Readable HTML/DOCX/PDF artifacts, versioned, with a review-and-sign-off field |
| **P4 — Contributor (strategic persona)** | Native speaker of an EU language who needs their country's pack to exist | A scaffolded, schema-validated, snapshot-tested pack they can complete in one evening without understanding the core |

### 1.2 Regulatory anchors (what the artifacts must satisfy)

- **Directive (EU) 2019/882** (European Accessibility Act) — enforceable 28 June 2025; disproportionate-burden assessment per Article 14 with documented 5-year reassessment; micro-enterprise exemption for services (<10 employees, <€2M turnover).
- **EN 301 549** — the harmonized standard. v3.2.1 (incorporates WCAG 2.1 AA) is current; **v4.1.1 incorporating WCAG 2.2 is expected to publish in 2026**, so standard mappings must be version-pluggable (REQ-MAP-4).
- **Directive (EU) 2016/2102** (Web Accessibility Directive) and **Commission Implementing Decision (EU) 2018/1523** — the model accessibility statement, which national formats derive from.
- **ITI VPAT 2.5** editions (WCAG / EU / 508 / INT) and the **GSA OpenACR** schema for machine-readable conformance reports.
- Enforcement is live: France filed lawsuits Nov 2025; Sweden opened market surveillance Oct 2025; penalties range up to €100k (DE), €200k (BE), €900k (SE), €1M (ES), and up to 18 months imprisonment (IE).

**Legal disclaimer requirement [MUST]:** every generated artifact carries a visible marker that it is a *draft for human review* and does not constitute legal advice, plus a named "reviewed by" field that must be filled before the draft watermark is removed.

---

## 2. Scope

### In scope (v1.0)
Evidence ingestion (axe-core, pa11y, Lighthouse JSON + manual checklist), WCAG→EN 301 549 mapping, three artifact families (accessibility statement, ACR/OpenACR, disproportionate-burden worksheet), jurisdiction packs with 5 launch locales, CLI, GitHub Action, CI regression mode, JS/TS library API.

### Out of scope (explicitly, to protect an 8h/week budget)
- Running the scans themselves (consume reports; never wrap axe) — avoids competing with the 242M-download incumbent
- Browser extension, SaaS dashboard, hosted anything
- Non-web EN 301 549 clauses (hardware, support services — clauses 5–8) in v1.0; the schema must *allow* them later (REQ-MAP-5)
- PDF/UA remediation, captioning, alt-text generation
- Python port (COULD, post-v1.0, only if PyPI distribution proves needed)
- US Section 508 workflow beyond what VPAT 2.5 INT already covers

---

## 3. Functional requirements

### 3.1 Evidence ingestion (FR-ING)

| ID | Requirement | Priority | Goal |
|---|---|---|---|
| FR-ING-1 | Parse **axe-core JSON** results (all versions ≥ 4.x), including violations, incomplete, passes and inapplicable, preserving rule IDs, impact, selectors and WCAG tags | MUST | G1 |
| FR-ING-2 | Parse **pa11y JSON** and **Lighthouse accessibility category JSON** | MUST | G1 |
| FR-ING-3 | Accept a **manual checklist file** (`manual.yaml`) covering criteria automation cannot judge (e.g. 1.2.x media alternatives, 2.4.x meaningful sequence, cognitive criteria). Ship a commented template enumerating every WCAG 2.1 AA criterion not fully automatable, with `status: pass | fail | partial | not-applicable | not-evaluated` and a free-text evidence field | MUST | G1 |
| FR-ING-4 | Merge multiple evidence files across pages/routes into one project-level evidence model, with per-URL provenance retained | MUST | G1 |
| FR-ING-5 | Reject unknown formats with an actionable error naming the supported formats and a docs link — never guess | MUST | G1 |
| FR-ING-6 | Ingestion is **pluggable via a reader interface** (`EvidenceReader`), so new formats (Playwright `ariaSnapshot`, WAVE, IBM Equal Access) are self-contained contributor units | SHOULD | **G2** |

### 3.2 Mapping engine (FR-MAP)

| ID | Requirement | Priority | Goal |
|---|---|---|---|
| FR-MAP-1 | Maintain a versioned mapping table: tool rule ID → WCAG success criterion → EN 301 549 clause (chapters 9–11 for web/software/docs). Shipped as data (`mappings/*.yaml`), not code | MUST | G1 |
| FR-MAP-2 | Compute per-criterion conformance status using a documented, deterministic precedence: manual override > automated fail > automated pass > not-evaluated. Conflicts are surfaced, never silently resolved | MUST | G1 |
| FR-MAP-3 | Every conclusion in every artifact is **traceable**: criterion → clause → evidence file → rule → selector/URL. Traceability table is itself an emittable artifact (`render trace`) | MUST | G1 |
| FR-MAP-4 | Standard versions are **pluggable**: WCAG 2.1/2.2 and EN 301 549 v3.2.1 ship in v1.0; v4.1.1 must be addable as a data-only PR when it publishes in 2026 | MUST | G1+G2 |
| FR-MAP-5 | The internal schema reserves clause space for non-web EN 301 549 chapters (5–8, 12–13) so future contributors can extend coverage without a breaking change | SHOULD | G2 |

### 3.3 Artifact generation (FR-ART)

| ID | Requirement | Priority | Goal |
|---|---|---|---|
| FR-ART-1 | **EU accessibility statement** per jurisdiction pack: compliance status (full / partial / not compliant), non-accessible content listing with EN 301 549 references, preparation date and method, feedback mechanism, enforcement-body details, in the pack's language(s) and structure. Output: HTML (self-contained, no external assets) + Markdown | MUST | G1 |
| FR-ART-2 | **ACR / VPAT 2.5** (INT and EU editions) emitted as **OpenACR-conformant YAML/JSON**, rendered to HTML and Markdown. OpenACR is the interchange format; renderers are views over it | MUST | G1 |
| FR-ART-3 | **Disproportionate-burden worksheet** (EAA Art. 14): structured prompts for cost-benefit reasoning, organisation size, micro-enterprise check, resulting scope exclusions, and an auto-computed **5-year reassessment date** | MUST | G1 |
| FR-ART-4 | DOCX and PDF renditions of all three artifacts (legal teams live in Word) | SHOULD | G1 |
| FR-ART-5 | Output is **deterministic**: identical inputs produce byte-identical outputs. No wall-clock timestamps (dates come from config or `--date`), stable key ordering, stable IDs. This is what makes `git diff` on artifacts meaningful and CI mode possible | MUST | G1+G2 |
| FR-ART-6 | Generated HTML must itself pass axe-core with zero violations — the tool dogfoods its own subject matter, enforced in CI | MUST | G1 (credibility) |
| FR-ART-7 | Every artifact carries the draft watermark + "reviewed by / on" fields per §1.2; `--reviewed-by` removes the watermark | MUST | G1 (liability) |

### 3.4 Jurisdiction packs — the strategic core (FR-PACK)

| ID | Requirement | Priority | Goal |
|---|---|---|---|
| REQ-PACK-1 | A jurisdiction pack is a **self-contained directory** (`packs/<ISO-3166 code>/`) containing: `pack.yaml` (metadata, enforcement body, legal references, deadlines), one or more statement templates, `strings.<lang>.yaml` translation files, a test fixture, and expected-output snapshots. **A pack must be completable by someone who has never read the core engine** | MUST | **G2** |
| REQ-PACK-2 | Packs are validated by a **JSON Schema** in CI; a structurally valid pack with passing snapshots is mergeable on translation review alone. The schema is the reviewer | MUST | G2 |
| REQ-PACK-3 | `eaa-kit contrib scaffold-pack --country fr` generates a complete skeleton — templates pre-filled with TODOs, fixture wired, snapshot harness ready. (The Home Assistant scaffolding lesson: convert mentoring into automation) | MUST | G2 |
| REQ-PACK-4 | A published **pack quality scale** — Bronze (statement template + one language), Silver (+ all official languages of that state + enforcement-body verification), Gold (+ DOCX template + reviewed by a native-speaker second contributor) — displayed in a README support matrix. Objective and self-checkable, so contributors know when they're done | MUST | G2 |
| REQ-PACK-5 | v1.0 ships **5 maintainer-authored launch packs** (proposed: DE, FR, ES, IT, IE — the loudest enforcement regimes) as exemplars; the remaining 22 member states + EEA (NO, IS, LI) + UK (PAS/equality context) are **reserved as labelled good-first-issues before launch** — a pre-seeded backlog of 25+ scoped contributor tasks (research: you need ~75 labelled issues for 20 contributors at the ~27% newcomer pickup rate; packs plus readers plus renderers plus translations gets there) | MUST | G2 |
| REQ-PACK-6 | `CODEOWNERS` maps each pack to its contributors, giving pack authors review standing on their own jurisdiction — ownership is the retention mechanism | SHOULD | G2 |

### 3.5 CLI (FR-CLI)

| ID | Requirement | Priority |
|---|---|---|
| FR-CLI-1 | `npx eaa-kit init` — interactive wizard producing `eaa.config.yaml` (organisation, jurisdiction, languages, evidence paths, scope). **Zero signup, zero network** | MUST |
| FR-CLI-2 | `eaa-kit render statement|acr|burden|trace [--jurisdiction XX] [--lang xx] [--format html|md|docx|pdf|openacr]` | MUST |
| FR-CLI-3 | `eaa-kit check` — CI mode: compares current conformance against a committed baseline (`eaa.lock.json`); exits non-zero on regression (a criterion that was `pass` becoming `fail`), prints a human-readable diff. **This is the recurring-use hook that turns a one-shot generator into a CI dependency** (download economics: Tier-2, installed on every CI run) | MUST |
| FR-CLI-4 | `eaa-kit contrib scaffold-pack` / `scaffold-reader` — contributor scaffolding (REQ-PACK-3) | MUST |
| FR-CLI-5 | First run to first artifact in **under 5 minutes** with only an axe JSON file in hand; this exact flow is the README GIF | MUST |
| FR-CLI-6 | `--json` output mode on every command for scripting | SHOULD |

### 3.6 CI integrations (FR-CI)

| ID | Requirement | Priority |
|---|---|---|
| FR-CI-1 | First-party **GitHub Action** (`eaa-kit/action`): runs `check`, uploads artifacts, posts a PR comment summarising conformance deltas | MUST |
| FR-CI-2 | Documented recipes for GitLab CI and generic runners (the tool is a plain CLI; recipes are docs, and docs-recipes for other CI systems are another contributor unit) | SHOULD |
| FR-CI-3 | **pre-commit hook definition** published, so the checker rides the `pre-commit` distribution channel | SHOULD |

### 3.7 Library API (FR-API)

| ID | Requirement | Priority |
|---|---|---|
| FR-API-1 | Core exposed as a typed JS/TS library (`@eaa-kit/core`): `loadEvidence()`, `computeConformance()`, `renderArtifact()` — the CLI is a thin wrapper. This is what lets Storybook addons, Playwright reporters and other tools take eaa-kit as a **transitive dependency** (the only proven route to 200k downloads) | MUST |
| FR-API-2 | Package layout: `@eaa-kit/core` (engine, near-zero deps), `eaa-kit` (CLI), `@eaa-kit/packs` (jurisdiction data, versioned independently so translation releases don't bump the engine) | SHOULD |

---

## 4. Non-functional requirements (NFR)

| ID | Requirement | Rationale |
|---|---|---|
| NFR-1 | **No network access at runtime. Ever.** No telemetry, no update checks, no fetching templates. | Privacy posture is a differentiator vs. consultancy SaaS; also removes the entire class of supply-chain suspicion a compliance tool cannot afford |
| NFR-2 | **Runtime dependencies ≤ 5** in `@eaa-kit/core`; every dep justified in `DEPENDENCIES.md`. Vendor small utilities rather than adding deps | 2026 supply-chain anxiety actively penalises dependency-heavy packages; the `tinyglobby` lesson (won on 2 deps vs 17) |
| NFR-3 | Node ≥ 20 LTS; pure ESM with CJS compat build; runs on Linux/macOS/Windows | Baseline portability |
| NFR-4 | Full render of a 500-page evidence set in < 10 s on commodity hardware | It runs in CI; CI minutes are money |
| NFR-5 | **License: MIT** (or Apache-2.0) — OSI-approved is a hard grant gate; permissive maximises adoption as a dependency | Grant §2.3 + download economics |
| NFR-6 | All user-facing strings in the core pass through the same i18n layer packs use — the tool practices the multilingualism it enables | Credibility + makes UI translations yet another contributor unit |
| NFR-7 | Semantic versioning; pack data changes are minor releases. Target **≥ 12 releases/year** (feeds the OpenSSF `recent_releases` signal, threshold 26/yr, weight 0.5) | G2 long-tail |
| NFR-8 | Errors are actionable: what failed, why, what to do, docs link. No stack traces at users | DX = conversion |
| NFR-9 | Security: schema-validate all inputs; templates are logic-less (no arbitrary code execution via pack templates — packs are *data*, and untrusted-template injection is the one attack surface this design must close) | A compliance tool that executes contributor code from packs would be its own supply-chain incident |

---

## 5. Repository & DX requirements (the conversion machinery)

These are requirements on the *repo*, not the binary — because the research is unambiguous that contributor conversion is won here.

| ID | Requirement |
|---|---|
| DX-1 | `CONTRIBUTING.md` names the **smallest valid contribution** explicitly ("a Bronze pack for one country: ~2 files, ~1 evening") and includes an **AI-assistance disclosure policy from day one** (retrofitting after a slop wave is much harder) |
| DX-2 | Devcontainer + Codespaces config: `git clone` → tests green in one step. CI auto-formats (never style-review humans) |
| DX-3 | **25+ good-first-issues seeded before launch** (REQ-PACK-5), each with the scaffold command inline, weighted toward pack work (self-contained) over core work. Grow toward 75 as reader/renderer/recipe units are cut |
| DX-4 | PR template auto-runs pack validation and posts the rendered artifact as a check artifact, so a contributor *sees their statement* before a human reviews it |
| DX-5 | Process commitment (documented in MAINTAINERS.md): human reply to every first-time contributor within 24 hours (explains 64.7% of PR-lifetime variance; bots explain 0.33%) |
| DX-6 | README: rendered-statement GIF above the fold, one-command trial, the 27-state support matrix with quality badges — the matrix's empty cells are the standing invitation |
| DX-7 | Repo opts into **Hacktoberfest** (October 2026) only with the backlog from DX-3 in place and daily review capacity that month |

---

## 6. Quality & testing (QA)

| ID | Requirement |
|---|---|
| QA-1 | Golden-file snapshot tests for every artifact × every pack × every language; byte-identical determinism (FR-ART-5) asserted in CI |
| QA-2 | Mapping-table completeness test: every WCAG 2.1 AA criterion is either mapped or explicitly listed as manual-only — no silent gaps |
| QA-3 | Fixture corpus of real-world axe/pa11y/Lighthouse outputs (including malformed ones) as regression inputs |
| QA-4 | Generated-HTML axe check (FR-ART-6) as a CI gate |
| QA-5 | Coverage ≥ 90% on `@eaa-kit/core`; packs covered by QA-1 by construction |
| QA-6 | A `validate-pack` command doubles as the contributor's local test runner — the CI gate and the contributor tool are the same code path |

---

## 7. Distribution requirements

| ID | Requirement |
|---|---|
| DIST-1 | npm packages under a scoped org; name must pass: npm availability, no trademark collision, and **the search test** — a person googling "EAA accessibility statement generator" or "VPAT generator open source" should land on it. (`eaa-kit` is the working name; validate before launch. Name for the query, not the pun) |
| DIST-2 | GitHub Action published to the Marketplace; pre-commit hook published (FR-CI-3) |
| DIST-3 | Launch sequence per the 90-day playbook: all channels within one 48-hour window; Show HN titled `Show HN: eaa-kit – generate the EU accessibility statement the EAA requires, from your axe results`, linking the repo; positioned as **compliance/accessibility tooling, never as an AI tool** (AI framing is a measured category penalty on HN in 2026; "open source projects" is the second-best category) |
| DIST-4 | Grant-calendar alignment: repo public + 5 packs by early September → **NLnet application when the window opens 3 September 2026** (deadline 3 November) → GitHub Secure Open Source Fund (rolling, $10k) → Hacktoberfest October → Claude for OSS application under the community-builder track once the contributor count is real |

---

## 8. Architecture overview

```
evidence (axe / pa11y / lighthouse JSON, manual.yaml)
        │
   [EvidenceReaders]  ← contributor unit #2 (new formats)
        │
   canonical evidence model (per-URL, per-rule)
        │
   [Mapping engine]   ← data-driven: mappings/*.yaml, versioned standards
        │
   conformance model (per WCAG criterion / EN clause, traceable)
        │
   [Renderers] ── statement ── ACR/OpenACR ── burden worksheet ── trace
        │              │
        │        [Jurisdiction packs]  ← contributor unit #1 (27+ states)
        │
   outputs: HTML · MD · OpenACR YAML/JSON · DOCX · PDF   (+ eaa.lock.json baseline)
```

Stack: **TypeScript, Node ≥ 20**. Logic-less templating (Liquid/Handlebars-class, or a vendored minimal engine per NFR-2/NFR-9). YAML for all human-edited data. No database, no daemon, no network.

---

## 9. Roadmap at 8 hours/week

| Phase | Weeks | Deliverable | Exit criterion |
|---|---|---|---|
| 1 — Core engine | 1–3 | Evidence model + axe reader + WCAG→EN mapping + conformance computation + trace output | `render trace` correct on fixture corpus |
| 2 — First artifacts | 4–6 | Statement (generic EU model, EN) + OpenACR output + HTML/MD renderers + determinism harness | First real statement generated from a real project in < 5 min |
| 3 — Packs & scaffolds | 7–9 | Pack schema, scaffolder, 5 launch packs (DE FR ES IT IE), quality scale, support matrix | A stranger completes a test pack from scaffold alone (recruit one friendly tester) |
| 4 — CI surface | 10–11 | `check` + lock file + GitHub Action + pa11y/Lighthouse readers + burden worksheet | Action green on a real repo; regression demo recorded |
| 5 — Launch | 12 | DX-1…DX-6 complete, 25+ GFIs live, 48-hour launch window, NLnet submission | Launched; NLnet filed |
| 6 — Community ops | 13+ | 24-hour reply discipline, pack reviews, Hacktoberfest, DOCX/PDF renderers | Contributor count is the KPI |

**Success metrics, in priority order:** unique external contributors with merged PRs (target 20 by month 10) → pack coverage (target 15/27 states by month 6) → npm downloads of `@eaa-kit/core` (target: adopted as a dependency by ≥ 1 testing-ecosystem tool) → stars (telemetry, not a target).

---

## 10. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Legal-accuracy error in a pack** (wrong enforcement body, stale reference) | Medium | Packs cite sources in `pack.yaml`; Silver+ requires enforcement-body URL verification; draft watermark + human sign-off (FR-ART-7); a compliance tool ships conservative language by default |
| Deque or a consultancy ships a free generator | Low–medium | Their incentive is services revenue, not open artifacts; the pack commons and OpenACR neutrality are the moat — move fast on the 27-state matrix, which a vendor won't crowdsource |
| Regulatory demand ≠ community demand (nobody files issues asking for this) | Medium | Validated honestly in the research as the open question. Mitigation: the 28 June 2027 deadline is a forcing function that *grows* the audience monotonically; `check` mode gives recurring CI value independent of the deadline |
| EN 301 549 v4.1.1 lands and reshuffles mappings | Certain (2026) | REQ-MAP-4 makes it a data PR — and a *high-visibility contributor event* to recruit around, not a rewrite |
| Maintainer bandwidth (8h/wk) collapses under review load | Medium | Schema-as-reviewer (REQ-PACK-2), scaffolds, CI artifact previews (DX-4) push review cost toward zero; recruit a co-maintainer from the first three pack authors (bus-factor discipline) |
| Pack templates as attack surface | Low | Logic-less templates, data-only packs (NFR-9) |

---

## 11. Acceptance criteria for v1.0

1. From a directory containing only `axe.json`, `eaa-kit init && eaa-kit render statement --jurisdiction de --lang de` produces a valid, axe-clean, watermarked German accessibility statement in under 5 minutes of user time.
2. `eaa-kit render acr --format openacr` validates against the OpenACR schema.
3. `eaa-kit check` fails CI on a seeded regression and passes on baseline.
4. All 5 launch packs are Silver; the support matrix renders in the README; ≥ 25 scaffold-linked good-first-issues are open.
5. Byte-identical re-render across two machines/OSes on the fixture corpus.
6. An external tester with no repo context completes a Bronze pack using only `scaffold-pack` and CONTRIBUTING.md.

---

*Runner-up note: if you'd rather optimise for the downloads track than contributors, the same exercise for `contrast-lint` (design-token contrast checking — 83.9% of all WCAG failures, distributed via Tailwind/Storybook plugin surfaces) is the document to write instead. Say the word and I'll produce it.*
