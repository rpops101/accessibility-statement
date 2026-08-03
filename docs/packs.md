# Jurisdiction packs

A pack tells accessibility-statement how an accessibility statement reads in one country:
the wording, the language, the national law, and the body a user complains
to. Packs are **data** — no code — and each is self-contained.

This is the project's central design decision. Twenty-seven member states
each need their own format and language, and no single maintainer can own
that. A native speaker who needs the artifact for their own employer can
ship a complete pack without ever reading the engine.

## Layout

```
packages/packs/packs/de/
├── pack.yaml              # metadata: law, enforcement body, languages, quality
├── strings.de.yaml        # translation
├── strings.en.yaml        # (optional) another language
├── templates/             # (optional) only when the national format differs
│   └── statement.html.mustache
├── fixture/               # a fake project the snapshot tests render
│   ├── config.yaml
│   └── axe.json
└── snapshots/             # expected output, committed
    ├── statement.de.html
    └── statement.de.md
```

Most packs have no `templates/` directory. Nearly every member state derives
its statement from the same EU model, so a pack is usually **`pack.yaml`
plus one translation** and inherits the shared templates from the `eu` pack.

## `pack.yaml`

```yaml
schemaVersion: 1
country: de                        # ISO 3166-1 alpha-2, lowercase
name: Germany (Deutschland)
languages: [de, en]                # every language this pack ships
defaultLanguage: de
legal:
  act: Barrierefreiheitsstärkungsgesetz (BFSG)
  references:                      # optional supporting instruments
    - Verordnung zum Barrierefreiheitsstärkungsgesetz (BFSGV)
  sources:                         # required, https:// only
    - https://www.gesetze-im-internet.de/bfsg/
enforcement:
  name: Marktüberwachungsstelle der Länder ... (MLBF)
  url: https://mlbf-barrierefrei.de/
  address: ...
  verified: "2026-08-03"           # required for Silver and above
  # Optional. Some member states give consumers a conciliation or
  # ombudsman route before, or instead of, the surveillance authority.
  # Naming only the authority would send people to the wrong door.
  conciliation:
    name: Schlichtungsstelle nach § 16 BGG
    url: https://www.schlichtungsstelle-bgg.de/
    note: Verfahren nach § 34 BFSG
deadlines:
  enforceableSince: "2025-06-28"
  notes: Bußgelder bis zu 100.000 EUR (§ 37 BFSG).
quality: silver                    # bronze | silver | gold
maintainers:
  - your-github-handle
```

`legal.sources` is not decoration. It is how a reviewer who does not read
your language verifies your pack. Official government or legislature
domains only.

### Getting the enforcement body right

This is the field most worth slowing down on. During verification of the
launch packs, the German pack turned out to cite `mlbf.de` — which returns
a perfectly healthy HTTP 200 for a **cable-assembly manufacturer**. The
actual authority is at `mlbf-barrierefrei.de`. A German user following that
statement would have sent an accessibility complaint to a company that
makes industrial cables.

So:

- **A 200 response proves nothing.** `node scripts/check-pack-links.mjs`
  catches dead and moved links, and it explicitly cannot catch this. Open
  the page and read it.
- **Check who is competent for *services*, not just products.** Several
  member states split the two, and some (Ireland) use a different legal
  term for each. Spain devolves enforcement to the autonomous communities
  entirely; France names six sector authorities in one article.
- **Check whether there is a conciliation route first.** Germany gives
  consumers a Schlichtung right under § 34 BFSG before the surveillance
  procedure. Use `enforcement.conciliation` for it.
- **Set `enforcement.verified` to the date you read the page**, not the
  date you copied the URL from somewhere else.

## Strings

A strings file overrides the core English strings for one language:

```yaml
statement:
  title: "Erklärung zur Barrierefreiheit"
  complianceStatusHeading: "Stand der Vereinbarkeit mit den Anforderungen"
```

Rules:

- Keys never change; only the text does.
- Any key you omit falls back to English, so a partial translation is valid.
- Prefer the wording your national authority already uses over a literal
  translation of the English.

An optional `criteria:` block translates WCAG success-criterion names:

```yaml
criteria:
  "1.1.1": "Nicht-Text-Inhalt"
  "1.4.3": "Kontrast (Minimum)"
```

Untranslated criteria fall back to the English W3C name. Where the W3C
publishes an authorised translation of WCAG for your language, use its
wording rather than inventing your own.

## The quality scale

Objective and self-checkable, so you know when you are finished.

| | Requirements |
| --- | --- |
| 🥉 **Bronze** | Statement renders in one language; `pack.yaml` complete with sources |
| 🥈 **Silver** | + every official language of the state; + `enforcement.url` and `enforcement.verified` |
| 🥇 **Gold** | + DOCX template; + translation reviewed by a second native speaker |

`validate-pack` enforces the mechanical parts: claiming Silver without a
verified enforcement body fails.

## Validation

```bash
npx accessibility-statement validate-pack packages/packs/packs/de   # one pack
npx accessibility-statement validate-pack                           # all of them
```

This is the same code path CI runs (QA-6), so green locally means green in
CI. It checks:

- `pack.yaml` against the shipped JSON Schema
- No leftover `TODO` placeholders anywhere in the pack
- A strings file exists for every declared language
- Templates parse and are logic-less
- Quality-level requirements

## Custom templates

Only add `templates/` when your national format genuinely differs — an extra
mandatory section, a different ordering. Copy
`packs/eu/templates/statement.html.mustache` and edit it.

Templates are a strict Mustache subset with **no expression evaluation**:

| Syntax | Meaning |
| --- | --- |
| `{{key}}` | Insert a value, HTML-escaped |
| `{{#key}}…{{/key}}` | Section: loop an array, descend into an object, or render once if truthy |
| `{{^key}}…{{/key}}` | Render when absent or empty |
| `{{.}}` | The current value inside a section |
| `{{a.b}}` | Nested lookup |
| `{{! … }}` | Comment |

There are no lambdas, no partials and no property access outside the
supplied data (not even through the prototype chain). This is deliberate:
packs come from contributors, and a template that could execute code would
make every pack a supply-chain risk (NFR-9).

### Template data

The full view model is documented in `buildStatementView`
([source](../packages/core/src/render/statement.ts)). The main keys:

| Key | What it holds |
| --- | --- |
| `t` | Resolved strings for the language (`{{t.statement.title}}`) |
| `lang`, `draft`, `watermark`, `reviewedBy`, `reviewedOn` | Document state |
| `org`, `product`, `feedback` | From the project config |
| `compliance.isFull` / `.isPartial` / `.isNonCompliant` | Booleans for sections |
| `nonAccessible[]` | Failing criteria: `criterion`, `name`, `level`, `clause`, `messages[]`, `urls[]` |
| `notEvaluated[]` | Criteria with no evidence |
| `burden.claimed`, `burden.exclusions[]` | Article 14 exemptions |
| `enforcement`, `legal`, `country` | From `pack.yaml` |
| `dates`, `method`, `standards` | Preparation metadata |

Adding keys is safe; renaming or removing them breaks every pack, so it is
a breaking change.

## Snapshots

```bash
npm run update-snapshots -w @accessibility-statement/packs -- de
```

Snapshots are committed so that a change to the engine can never silently
alter your country's statement. If a core change moves your output, CI
fails and a human decides whether that was intended.
