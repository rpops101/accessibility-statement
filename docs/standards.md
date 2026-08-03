# Standards and versions

## Bundled today

| Standard | Versions | File |
| --- | --- | --- |
| WCAG | 2.1, 2.2 (levels A and AA) | `packages/core/data/standards/wcag-*.yaml` |
| EN 301 549 | 3.2.1 (web clauses, chapter 9) | `packages/core/data/standards/en301549-3.2.1.yaml` |

Select them per project:

```yaml
standards:
  wcag: "2.1"
  en301549: "3.2.1"
```

Pin these. Changing a standard version changes which criteria exist, which
changes your artifacts and your baseline.

## How the mapping works

EN 301 549 chapter 9 mirrors WCAG numbering: clause `9.1.4.3` corresponds to
success criterion `1.4.3` (Table A.1 of the standard). Every criterion in a
generated artifact carries both references, so a reader can follow either
regime.

Chapters 5–8 (generic and hardware), 10 (non-web documents), 11 (software),
12 (documentation and support) and 13 (relay and emergency services) are
declared as `reservedChapters`. The schema accepts them, so extending
coverage later is additive rather than breaking (FR-MAP-5). v1.0 covers web
only.

## WCAG 2.1 versus 2.2

WCAG 2.2 removes 4.1.1 Parsing and adds six A/AA criteria: 2.4.11 Focus Not
Obscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum),
3.2.6 Consistent Help, 3.3.7 Redundant Entry and 3.3.8 Accessible
Authentication (Minimum).

EN 301 549 v3.2.1 incorporates WCAG 2.1, so `wcag: "2.1"` is the default and
the right choice for most EU compliance work today.

## When EN 301 549 v4.1.1 publishes

v4.1.1, incorporating WCAG 2.2, is expected in 2026. Adding it is a
**data-only** change, by design (FR-MAP-4):

1. Add `packages/core/data/standards/en301549-4.1.1.yaml`.
2. Do **not** edit the v3.2.1 file. A project that pinned v3.2.1 must keep
   getting v3.2.1 output forever; artifacts that change under people are
   worse than artifacts that are slightly out of date.
3. Update the criterion mapping where the new version reshuffles clauses.
4. Ship it as a minor release.

There is [an issue open for it](../../issues?q=is%3Aissue+label%3Astandards)
and it will be a good one to pair on.

## The `automation` field

Each criterion records how far automated tools can judge it:

| Value | Meaning |
| --- | --- |
| `full` | Automated tools reliably detect most failures |
| `partial` | Tools catch some failure modes; manual review still required |
| `none` | Effectively not automatable |

This drives the generated manual checklist and a CI test (QA-2) asserting
that every criterion is either reachable by a shipped rule mapping or
explicitly marked as needing manual evaluation, with guidance. No silent
gaps.

Note that no WCAG criterion is currently marked `full`. Automated testing
finds roughly a third of accessibility failures at best; a tool that
implied otherwise would be lying in a document with legal weight.

## Rule mappings

`packages/core/data/rules/*.yaml` maps tool rule ids to WCAG criteria. See
[evidence-formats.md](evidence-formats.md#how-findings-become-criteria) for
the resolution order. Correcting a mapping is a one-line data pull request,
and a genuinely valuable contribution — a wrong mapping silently attributes
a failure to the wrong criterion.
