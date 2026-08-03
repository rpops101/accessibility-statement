# Maintainers

## Who

| Area | Maintainer |
| --- | --- |
| Core engine, packs schema, releases | *(project lead — add your handle here)* |
| Jurisdiction packs | The pack author for each country, via [CODEOWNERS](.github/CODEOWNERS) |

Pack authors have review standing on their own jurisdiction. Nobody changes your country's wording without you.

## Process commitments

These are promises, and they are the ones that matter most for whether this project survives.

### 1. A human reply to every first-time contributor within 24 hours

Not a bot, not a label — a person. Even when the answer is "thanks, I need a couple of days to review this properly," it goes out inside a day.

This is the single strongest predictor of whether a contributor ever comes back. Research on pull-request lifetimes attributes about 65% of the variance to maintainer responsiveness; automated responses account for essentially none of it. If we cannot keep this promise, we say so publicly and pause recruiting contributors rather than let pull requests rot.

### 2. Review cost stays near zero, structurally

We do not scale by reviewing harder. We scale by making review unnecessary:

- **The schema is the reviewer.** A structurally valid pack with passing snapshots is mergeable on translation review alone.
- **The scaffolder replaces mentoring.** Anything we would say twice becomes a `TODO` in `scaffold-pack` output.
- **CI shows the artifact.** Every pack pull request uploads its rendered statement, so reviewers read the output rather than reconstructing it from a diff.
- **CI formats code.** We never ask a human to change whitespace.

If reviewing a pack takes more than fifteen minutes, that is a bug in our tooling. File it as one.

### 3. Bus factor

We recruit a co-maintainer from among the first three pack authors. A project that only one person can release is a project with an expiry date.

### 4. Release cadence

Target twelve or more releases a year. Pack data changes are minor releases and ship promptly — a contributor should see their country live within days, not wait for a quarterly train.

### 5. Labels we keep meaningful

| Label | Meaning |
| --- | --- |
| `good first issue` | Genuinely completable without reading the engine, with the scaffold command inline |
| `pack` | A jurisdiction pack — the self-contained unit |
| `reader` | An evidence-format reader |
| `i18n` | Translation of the tool itself or of criterion names |
| `core` | Engine work; expect a longer review |
| `help wanted` | We want this and are not doing it ourselves soon |

An issue labelled `good first issue` that turns out to need engine knowledge gets relabelled and apologised for.

## Releasing

```bash
npm test                       # all packages green
npm run build
npm version <patch|minor|major> --workspaces
npm publish --workspaces --access public
```

Rules:

- `@eaa-kit/packs` versions independently. Translation releases must not bump the engine.
- Standard-version additions (e.g. EN 301 549 v4.1.1) are **minor** releases: new data files, never edits to shipped ones.
- Any change to rendered output is a **minor** release at minimum, even when the code change looks trivial. Someone's committed artifacts will change.

## Hacktoberfest

We opt in **only** when there is a real backlog of scoped issues and daily review capacity for the month. An unprepared Hacktoberfest converts goodwill into spam and burns the maintainer who signed up for it. If those conditions do not hold in a given year, we sit it out and say why.

## Security

Report vulnerabilities per [SECURITY.md](SECURITY.md). The design keeps the attack surface small deliberately: no network access, one runtime dependency, logic-less templates so contributed packs cannot execute code. Any change that weakens one of those needs an explicit, written justification.
