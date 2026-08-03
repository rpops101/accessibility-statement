# Evidence formats

accessibility-statement consumes reports from tools you already run. It never runs a scan
itself — axe-core owns that job and does it better than a document
generator would.

## Supported today

| Tool | Produce it with | Notes |
| --- | --- | --- |
| **axe-core** ≥ 4.x | `axe.run()` result written as JSON, or `@axe-core/cli --save axe.json` | Single result object or an array of them (one per page). Violations, incomplete, passes and inapplicable are all read |
| **pa11y** ≥ 6 | `pa11y --reporter json https://example.org > pa11y.json` | Errors become failures; warnings and notices become needs-review |
| **pa11y-ci** | `pa11y-ci --json > pa11y-ci.json` | Multi-URL aggregate; per-URL provenance retained |
| **Lighthouse** ≥ 10 | `lighthouse https://example.org --output json --output-path lh.json` | Only the accessibility category is read |

Point at them from your config:

```yaml
evidence:
  paths:
    - "axe.json"
    - "reports/"                 # every *.json in the directory
    - "reports/**/axe-*.json"    # wildcards work
  manual: "manual.yaml"
```

Multiple files merge into one project-level model with per-URL provenance
preserved, so a rule that fails on `/checkout` and passes on `/help` is
recorded as exactly that.

## How findings become criteria

Each tool finding maps to zero or more WCAG success criteria:

1. **The shipped mapping table** (`packages/core/data/rules/axe.yaml`) is
   authoritative for the rules it lists.
2. **Fallback for axe:** the rule's own `wcagNNN` tags are parsed, so rules
   released after your version of accessibility-statement still work.
3. **pa11y** codes embed the criterion
   (`WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail` → 1.4.3).
4. **Lighthouse** audit ids equal axe rule ids, so they resolve through the
   same table.
5. **Rules that map to nothing** (best-practice rules like `region`) are
   kept and reported in the trace artifact as unmapped. They never affect
   conformance, and they are never silently dropped.

Mappings are data. Correcting one is a YAML pull request.

## Unsupported files are an error

```console
$ accessibility-statement render statement
Error: Could not recognise the evidence format of reports/scan.json.
  Why:  It parses as JSON but matches none of the supported report shapes (accessibility-statement never guesses).
  Fix:  Supported formats:
  - axe-core JSON (axe.run() result or array of results, axe ≥ 4.x)
  - pa11y JSON (--reporter json) or pa11y-ci JSON (pa11y ≥ 6.x)
  - Lighthouse JSON report (accessibility category, Lighthouse ≥ 10)
```

Guessing at an unknown format would silently mis-parse somebody's
compliance evidence. Refusing is the safer failure.

## The manual checklist

Automated tools cannot judge most WCAG criteria. `manual.yaml` is where the
rest is recorded:

```yaml
checklist:
  - criterion: "1.2.2"
    status: fail
    evidence: The product tour video has no captions.
  - criterion: "2.4.3"
    status: pass
    evidence: Tabbed the whole checkout flow; focus order follows the visual order.
```

`status` is one of `pass`, `fail`, `partial`, `not-applicable` or
`not-evaluated`. `accessibility-statement init` writes a template listing every criterion
automation cannot fully judge, each with guidance on how to check it.

Manual entries take precedence over automated results — a human who looked
outranks a tool that guessed. When a manual `pass` overrides an automated
failure, the conflict is recorded in the trace artifact rather than being
quietly resolved.

## Adding a format

New readers are one of the best contributions to the project:

```bash
npx accessibility-statement contrib scaffold-reader --name wave
```

See [writing-a-reader.md](writing-a-reader.md).
