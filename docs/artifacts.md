# The artifacts

```bash
eaa-kit render statement|acr|burden|trace [--format …] [--lang …] [--out …]
eaa-kit render-all --out-dir eaa-artifacts
```

| Artifact | Formats | Default |
| --- | --- | --- |
| `statement` | `html`, `md`, `docx`, `pdf` | `html` |
| `acr` | `openacr`, `json`, `html`, `md`, `docx`, `pdf` | `openacr` |
| `burden` | `html`, `md`, `docx`, `pdf` | `html` |
| `trace` | `md`, `html`, `json`, `docx`, `pdf` | `md` |

`docx` and `pdf` are binary and require `--out`:

```bash
eaa-kit render statement --format docx --out statement.docx
eaa-kit render burden --format pdf --out burden.pdf
```

## Word and PDF

Legal teams live in Word, so DOCX is a first-class output rather than an
export. The generated document uses **real heading styles**, not bold
paragraphs, and tables carry a marked header row — that structure is what
makes a Word document navigable with a screen reader.

The PDF is **tagged**: it carries a structure tree, marked content, a
document language and `DisplayDocTitle`. An accessibility compliance tool
emitting an untagged PDF would be failing its own subject matter, and
untagged PDFs are exactly what EN 301 549 clause 10 exists to prevent. No
browser or headless Chrome is involved; the writer is vendored, so PDF
output works in any CI container.

Both are deterministic like every other format: ZIP entries carry a fixed
1980 timestamp and PDF dates come from your configuration, so re-rendering
an unchanged project produces identical bytes.

A jurisdiction pack can own its Word layout by shipping
`templates/statement.docx.xml.mustache` — the same logic-less template
mechanism as the HTML, applied to the WordprocessingML body. That is the
DOCX template the Gold quality level asks for.

## Accessibility statement

The document the European Accessibility Act requires, in your member
state's format and language. Structure follows the model statement of
Commission Implementing Decision (EU) 2018/1523:

- Compliance status — full, partial or non-compliant
- Non-accessible content, with WCAG criteria and EN 301 549 clause
  references, and the specific failures found
- Content excluded under a disproportionate-burden claim, if any
- Content not yet evaluated (stated plainly rather than omitted)
- Preparation date and evaluation method
- Feedback mechanism
- Enforcement procedure with the national body's contact details

HTML output is self-contained: no scripts, no external stylesheets, no
remote assets. It is checked with axe-core in CI, because a tool that emits
inaccessible accessibility documents has no standing.

## ACR / VPAT 2.5

An Accessibility Conformance Report in the **OpenACR** interchange format,
with HTML and Markdown views over the same object.

```bash
eaa-kit render acr --format openacr --out acr.yaml
```

Conformance levels use the OpenACR vocabulary: `supports`,
`partially-supports`, `does-not-support`, `not-applicable`,
`not-evaluated`. Criteria are grouped into Level A and Level AA chapters,
and the catalog identifier records the exact standard versions used
(`en-301-549-3.2.1-wcag-2.1`).

The report reflects manual checklist entries, not just tool output — which
is the whole point, since most criteria cannot be judged automatically.

## Disproportionate-burden worksheet

The Article 14 assessment, structured so the reasoning is recorded rather
than asserted:

- Organisation size and the **micro-enterprise check** (fewer than 10
  employees and at most €2M turnover). Absent data, it says the check could
  not be performed rather than guessing.
- Whether an exemption is claimed, and for exactly what scope
- Cost–benefit prompts mapped to the Annex VI criteria: estimated cost,
  benefit to the organisation, impact on people with disabilities,
  frequency and duration of use
- The **five-year reassessment date**, computed from the assessment date

Article 14(4) requires reassessment at the latest five years after the
assessment, when the service changes, or on request of the market
surveillance authority. The worksheet states all three triggers.

## Traceability report

Every conclusion, traced to what produced it:

```
criterion → EN 301 549 clause → evidence file → rule → selector/URL
```

Also lists:

- **Surfaced conflicts** — for example a manual `pass` overriding an
  automated failure. These are never silently resolved.
- **Unmapped findings** — best-practice rules that map to no WCAG
  criterion. They do not affect conformance but are not thrown away.

`--format json` is the machine-readable version, useful for dashboards or
for a reviewer's own tooling.

## The draft watermark

Every artifact carries a visible draft marker and a disclaimer until a
named person signs off:

```bash
eaa-kit render statement --reviewed-by "Jane Doe, Accessibility Officer" --reviewed-on 2026-12-01
```

Both flags are required. One alone leaves the watermark in place — a
document is not reviewed until there is a person *and* a date attached to
it. The same can be recorded permanently under `review:` in the config.

This is a liability control, not decoration. eaa-kit generates drafts from
evidence; it does not know whether your evidence is complete, and it does
not give legal advice.

## Determinism

Identical inputs produce byte-identical outputs. Commit your artifacts and
`git diff` tells you exactly what changed about your accessibility
position between two releases — which is far more useful than a document
that churns on every regeneration.
