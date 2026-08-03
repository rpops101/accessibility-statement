# eaa-kit

**Generate the EU accessibility statement the European Accessibility Act requires — from the axe results you already have.**

```bash
npx eaa-kit init
npx eaa-kit render statement --jurisdiction de --lang de --out statement.html
```

No signup. No network access, ever. No telemetry.

## What it produces

| Artifact | What it is |
| --- | --- |
| **Accessibility statement** | The statement your member state requires, in its format and language, listing non-accessible content with EN 301 549 references, feedback route and enforcement body |
| **ACR / VPAT 2.5** | Conformance report in the machine-readable OpenACR format, with HTML and Markdown views |
| **Disproportionate-burden worksheet** | Article 14 assessment with micro-enterprise check and the five-year reassessment date |
| **Traceability report** | Every conclusion traced: criterion → EN clause → evidence file → rule → selector |

It reads axe-core, pa11y, pa11y-ci and Lighthouse JSON, plus a manual
checklist for the criteria automation cannot judge. It never runs a scan
itself — axe-core owns that job.

## Commands

```
eaa-kit init                      Interactive wizard; writes eaa.config.yaml + manual.yaml
eaa-kit render <artifact>         statement | acr | burden | trace
eaa-kit render-all                Render everything into a directory
eaa-kit check                     Compare against eaa.lock.json; non-zero on regression
eaa-kit validate-pack [dir|code]  Validate jurisdiction packs
eaa-kit packs                     List available jurisdictions
eaa-kit contrib scaffold-pack     Start a new jurisdiction pack
eaa-kit contrib scaffold-reader   Start a new evidence-format reader
```

Add `--json` to any command for machine-readable output.

## Keeping it true

`eaa-kit check` compares current conformance against a committed baseline
and fails the build when a criterion regresses — so the statement stays
accurate after the day you generated it.

```console
$ eaa-kit check
Regressions:
  1.1.1: pass → fail

1 criterion regression against eaa.lock.json.
```

There is a [first-party GitHub Action](https://github.com/eaa-kit/eaa-kit/blob/main/docs/ci.md),
recipes for other CI systems, and a pre-commit hook.

## Jurisdictions

Germany, France, Spain, Italy and Ireland ship today, plus a generic EU
model statement. **The other 22 member states are open contributions** —
a pack is data, not code, and takes about an evening:

```bash
npx eaa-kit contrib scaffold-pack --country pt
```

See the [support matrix](https://github.com/eaa-kit/eaa-kit#jurisdiction-support-matrix)
and [CONTRIBUTING.md](https://github.com/eaa-kit/eaa-kit/blob/main/CONTRIBUTING.md).

## Licence

MIT.

---

*eaa-kit generates drafts for human review. Every artifact carries a draft
watermark until a named person signs off with `--reviewed-by` and
`--reviewed-on`. It does not constitute legal advice.*
