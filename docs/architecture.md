# Architecture

```
evidence (axe / pa11y / lighthouse JSON, manual.yaml)
        │
   [EvidenceReaders]  ←── contributor unit: new formats
        │
   canonical evidence model (per-URL, per-rule)
        │
   [Mapping engine]   ←── data-driven: data/rules/*.yaml, data/standards/*.yaml
        │
   conformance model (per WCAG criterion / EN clause, traceable)
        │
   [Renderers] ── statement ── ACR/OpenACR ── burden worksheet ── trace
        │              │
        │        [Jurisdiction packs]  ←── contributor unit: 27+ states
        │
   outputs: HTML · MD · OpenACR YAML/JSON   (+ eaa.lock.json baseline)
```

Each arrow is one-way. Renderers never read evidence files; readers never
know what a statement looks like. That separation is what makes both
contributor units self-contained.

## Packages

| Package | Contents | Why separate |
| --- | --- | --- |
| `@eaa-kit/core` | The engine | One runtime dependency, so tools can take it transitively without inheriting a dependency tree |
| `@eaa-kit/packs` | Jurisdiction data | Versioned independently: a translation release must not bump the engine |
| `eaa-kit` | CLI | A thin wrapper; every command maps to a library call |

## The pipeline

### 1. Evidence ingestion — `src/evidence/`

Readers implement `detect()` / `read()` and produce `Finding` records:
rule id, outcome, WCAG criteria, URL, selectors. Files merge into one model
with per-URL provenance preserved. Unknown formats are an error, never a
guess.

### 2. Mapping — `src/mapping/`

Standards (`data/standards/*.yaml`) and rule tables (`data/rules/*.yaml`)
are data, embedded into the build so no runtime path resolution is needed.
Adding EN 301 549 v4.1.1 means adding a file, never editing a shipped one —
a project that pinned v3.2.1 must keep getting v3.2.1 output forever.

### 3. Conformance — `src/mapping/conformance.ts`

Documented, deterministic precedence:

1. A manual entry with a status other than `not-evaluated` decides the
   criterion. Overriding an automated failure records a conflict.
2. Otherwise any automated `fail` ⇒ `fail`.
3. Otherwise any automated `pass` ⇒ `pass`.
4. Otherwise `not-evaluated`.

`incomplete` never decides anything; it appears in the trace as a
needs-review signal. Conflicts are surfaced, never silently resolved — a
compliance tool that quietly picks a side is worse than one that asks.

Compliance level is conservative: `full` requires that every criterion was
actually evaluated and passes or is not applicable. Unevaluated criteria
force `partial`.

### 4. Rendering — `src/render/`

The statement goes through the pack's Mustache-subset template. The ACR,
burden worksheet and trace are rendered by core (they are
jurisdiction-independent). OpenACR is the ACR's interchange format; HTML and
Markdown are views over the same object.

## Determinism

FR-ART-5 is load-bearing, because it is what makes `git diff` on a statement
mean something and CI mode possible at all.

- Dates come from config or `--date`, never `Date.now()`.
- Object keys are sorted before serialization (`sortKeysDeep`).
- Arrays are sorted with explicit comparators; criterion ids compare
  numerically (`1.4.2` before `1.4.10`).
- No random ids, no locale-dependent formatting.

CI renders the whole fixture corpus on Linux, macOS and Windows and
compares SHA-256 hashes across all three.

## Security posture

| Surface | Control |
| --- | --- |
| Pack templates | Logic-less: sections and variables only, own-property lookup only. A pack cannot execute code |
| Evidence files | Schema-validated; strict `detect()`; malformed input produces an actionable error |
| Dependencies | One runtime dependency in core, enforced by a CI budget check |
| Network | None, ever. A CI job stubs every network primitive and renders everything |

## Testing

| Layer | What it covers |
| --- | --- |
| `packages/core/test/evidence.test.ts` | Readers, merging, malformed input |
| `packages/core/test/conformance.test.ts` | Precedence, mapping completeness (QA-2), standards pluggability |
| `packages/core/test/render.test.ts` | Templates, all four artifacts, watermark, determinism |
| `packages/core/test/dogfood.test.ts` | Generated HTML is accessible and self-contained |
| `packages/core/test/config-lock-packs.test.ts` | Config and pack validation, lock diffing |
| `packages/packs/test/packs.test.ts` | Golden-file snapshots per pack per language |
| `packages/cli/test/cli.test.ts` | The CLI as a subprocess: exit codes, error text, the full flow |

## Extension points

| To add | Touch |
| --- | --- |
| A tool format | One reader module + fixture |
| A country | One pack directory (data only) |
| A standard version | One YAML file in `data/standards/` |
| A rule mapping | One line in `data/rules/*.yaml` |
| A language for the tool itself | One YAML file in `data/strings/` |

Only the first requires writing code, and it requires touching nothing else.
