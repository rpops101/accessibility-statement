# Running eaa-kit in CI

`eaa-kit check` turns a one-off document generator into something that
keeps telling you the truth. It compares current conformance against a
committed baseline and fails when a criterion regresses.

## The baseline

```bash
eaa-kit check --update   # writes eaa.lock.json
git add eaa.lock.json && git commit -m "Record accessibility baseline"
```

`eaa.lock.json` records one status per WCAG criterion, with sorted keys so
diffs are readable:

```json
{
  "criteria": {
    "1.1.1": "fail",
    "1.4.3": "pass"
  },
  "enVersion": "3.2.1",
  "lockVersion": 1,
  "wcagVersion": "2.1"
}
```

Commit it. It is the record of what you had already achieved.

## What counts as a regression

Statuses are ranked, and any move down the rank fails the build:

| Change | Verdict |
| --- | --- |
| `pass` → `fail` | **Regression** |
| `pass` → `not-evaluated` | **Regression** — losing coverage is losing ground |
| `partial` → `fail` | **Regression** |
| `fail` → `pass` | Improvement |
| `not-evaluated` → anything decided | Improvement |
| `pass` ↔ `not-applicable` | Neutral |
| Criteria added or removed by a standard change | Neutral, and reported |

When a regression is intentional, record it deliberately:

```bash
eaa-kit check --update
```

That produces a diff a reviewer can see and question, which is the point.

## GitHub Actions

```yaml
name: Accessibility
on: [pull_request]

jobs:
  eaa:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write   # for the summary comment
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      # Produce evidence however you already do it.
      - run: npm ci && npm run test:a11y   # writes axe.json

      - uses: rpops101/eaa-kit/action@v1
        with:
          jurisdiction: de
          lang: de
```

> **Before the first release**, no `v1` tag exists yet. Use
> `rpops101/eaa-kit/action@main` until one is published, or pin a commit SHA
> — pinning a SHA is good practice for third-party actions regardless.

The action runs `check`, uploads the rendered statement, ACR and burden
worksheet as build artifacts, and posts (or updates) a pull-request comment
with the conformance delta.

| Input | Default | Purpose |
| --- | --- | --- |
| `config` | `eaa.config.yaml` | Configuration file |
| `jurisdiction` | from config | Pack to render with |
| `lang` | from config | Statement language |
| `lock` | `eaa.lock.json` | Baseline path |
| `check` | `true` | Fail the job on a regression |
| `render` | `true` | Render and upload artifacts |
| `comment` | `true` | Post the summary on pull requests |

| Output | Meaning |
| --- | --- |
| `compliance` | `full`, `partial` or `non-compliant` |
| `regressions` | Number of criteria that regressed |
| `artifacts-path` | Where artifacts were written |

## Other CI systems

eaa-kit is a plain CLI with no network access, so any runner works. Recipes:

- [GitHub Actions](recipes/github-actions.md)
- [GitLab CI](recipes/gitlab-ci.md)

Writing a recipe for another system is a [welcome contribution](../CONTRIBUTING.md#contribution-unit-4-ci-recipes).
The general shape:

```bash
npm install --no-save eaa-kit @eaa-kit/packs
npx eaa-kit check --json > conformance.json   # exit 1 on regression
npx eaa-kit render-all --out-dir eaa-artifacts
```

Use `--json` on any command for machine-readable output.

## pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/rpops101/eaa-kit
    rev: v0.1.0
    hooks:
      - id: eaa-kit-check
```

The hook runs against the evidence already in the repository. It does not
run a scan, so it stays fast enough for a commit hook.

## Keeping evidence fresh

`check` is only as good as the evidence it reads. A regression is caught
only if the reports are regenerated in the same job. The usual shape:

1. Build the app.
2. Run axe/pa11y/Lighthouse against it, writing JSON.
3. Run `eaa-kit check`.

Checking stale evidence into the repository and never regenerating it makes
the gate decorative.
