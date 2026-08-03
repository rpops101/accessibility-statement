# Configuration reference — `eaa.config.yaml`

`eaa-kit init` writes a commented version of this file. Everything here is
local; eaa-kit never sends it anywhere.

A JSON Schema ships at [`schemas/eaa.config.schema.json`](../schemas/eaa.config.schema.json)
for editor autocomplete. It is generated from the schema the engine
actually validates against, so it cannot drift.

## Minimal example

```yaml
organisation:
  name: Example GmbH
product:
  name: Example Shop
jurisdiction: de
languages: [de]
evidence:
  paths: ["axe.json"]
dates:
  preparation: "2026-08-03"
```

## Fields

### `organisation` (required)

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Appears in every artifact |
| `email`, `phone`, `address`, `website` | no | Contact details in the statement and ACR |
| `employees` | no | Drives the micro-enterprise check |
| `turnoverEUR` | no | Drives the micro-enterprise check |

`employees` and `turnoverEUR` together decide the micro-enterprise question
in the burden worksheet: fewer than 10 employees **and** at most €2 000 000
turnover. Omit them and the worksheet says the check could not be
performed — which is honest, and better than guessing.

### `product` (required)

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | What the statement is about |
| `scope` | no | Free text describing exactly what is covered. Worth writing carefully: it bounds what you are claiming |
| `urls` | no | Pages or routes covered |

### `jurisdiction` (required)

Two-letter lowercase code of the jurisdiction pack, or `eu` for the generic
EU model statement. `eaa-kit packs` lists what is available. If your country
is missing, `eaa-kit contrib scaffold-pack --country xx` starts it.

### `languages` (required)

BCP 47 primary tags, most important first. The first is the default for
`render`. The pack must ship each language you list — `eaa-kit render` names
the available ones if it does not.

### `evidence` (required)

```yaml
evidence:
  paths:
    - "axe.json"                # a file
    - "reports/"                # a directory: every *.json in it
    - "reports/**/axe-*.json"   # a wildcard pattern
  manual: "manual.yaml"
```

Supported report formats: axe-core JSON (single result or array),
pa11y JSON and pa11y-ci JSON, Lighthouse JSON. See
[evidence-formats.md](evidence-formats.md). Unrecognised files are an
error, never a guess.

`manual` points at the checklist covering criteria automation cannot judge.
`eaa-kit init` generates a template listing every one of them with guidance.

### `dates` (required)

```yaml
dates:
  preparation: "2026-08-03"       # required
  lastReview: "2026-12-01"        # optional
  burdenAssessment: "2026-07-01"  # optional; defaults to preparation
```

Dates are always explicit and never taken from the system clock. That is
what makes output byte-identical across runs and machines, which is what
makes `git diff` on a statement meaningful.

### `evaluationMethod`

Free text: how the assessment was performed. The model statement expects
this. Example: *"Self-assessment with automated testing (axe-core) and a
manual checklist."*

### `feedback`

```yaml
feedback:
  email: "accessibility@example.org"
  url: "https://example.org/accessibility-feedback"
  phone: "+49 30 000000"
```

A feedback mechanism is mandatory content in the statement. If omitted,
`organisation.email` is used.

### `review`

```yaml
review:
  reviewedBy: "Jane Doe, Accessibility Officer"
  reviewedOn: "2026-12-01"
```

Filling **both** fields removes the draft watermark. The same effect is
available per-run with `--reviewed-by` and `--reviewed-on`. One field alone
is not enough — a document is not reviewed until someone and some date are
attached to it.

### `burden`

```yaml
burden:
  claimed: true
  exclusions:
    - scope: "Archived PDF documents published before 2020"
      reason: "Remediation estimated at 40 person-days for under 0.1% of traffic."
      criteria: ["1.1.1"]
  costBenefit:
    estimatedCost: "EUR 40,000"
    organisationBenefit: "Low: the archive is not part of the purchase flow."
    disabledUserImpact: "Low: equivalent content is available in HTML."
    frequencyOfUse: "Under 300 views per month across 12,000 documents."
  notes: "Reassessed with the 2027 redesign."
```

Renders the Article 14 worksheet, lists the exclusions in the statement, and
computes the mandatory five-year reassessment date. The four `costBenefit`
prompts map to the Annex VI criteria; unfilled ones render as *(to be
completed)* rather than being hidden.

### `standards`

```yaml
standards:
  wcag: "2.1"        # or "2.2"
  en301549: "3.2.1"
```

Defaults shown. Pin these: changing a standard version changes which
criteria exist, which changes your artifacts and your baseline.

## Multiple projects

An agency running many clients keeps one config per client and passes
`--config`:

```bash
eaa-kit render statement --config clients/acme/eaa.config.yaml --out clients/acme/statement.html
```

Evidence paths resolve relative to the config file, not the working
directory, so this works from anywhere.
