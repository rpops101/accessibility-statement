# Writing an evidence reader

A reader turns one tool's report into canonical findings. It is a
self-contained contribution: one module, one test, one fixture. It never
touches conformance computation, rendering or packs.

```bash
npx accessibility-statement contrib scaffold-reader --name wave
```

## The interface

```ts
export interface EvidenceReader {
  /** Short id, used as Finding.source and in trace output. */
  name: string;
  /** Human-readable label, shown when accessibility-statement cannot recognise a file. */
  formatLabel: string;
  /** True only if the parsed JSON is this reader's format. */
  detect(parsed: unknown, path: string): boolean;
  /** Convert the parsed document into canonical findings. */
  read(parsed: unknown, path: string): EvidenceFile;
}
```

## `detect` must be strict

This is the rule that matters. A reader that claims another tool's file
will silently mis-parse someone's compliance evidence, and they will
publish a statement based on it.

Check for a field no other supported tool emits:

```ts
detect: (parsed) =>
  typeof parsed === 'object' &&
  parsed !== null &&
  typeof (parsed as WaveReport).waveVersion === 'string' &&
  Array.isArray((parsed as WaveReport).categories),
```

Not this:

```ts
detect: (parsed) => Array.isArray(parsed),   // matches half the ecosystem
```

If two formats are genuinely indistinguishable, say so in the pull request
rather than picking one — accessibility-statement would rather refuse a file than guess at
it.

## `read`

Emit one `Finding` per issue:

```ts
findings.push({
  ruleId: issue.id,          // the tool's own rule identifier
  source: 'wave',            // your reader name
  outcome: 'fail',           // 'fail' | 'pass' | 'incomplete' | 'inapplicable'
  criteria: ['1.1.1'],       // WCAG criteria; [] if the rule maps to none
  url: issue.url,
  selectors: [issue.selector],
  message: issue.description,
  impact: issue.severity,    // verbatim from the tool
});
```

Outcome semantics, which the precedence rules depend on:

| Outcome | Meaning | Effect on conformance |
| --- | --- | --- |
| `fail` | The tool found a violation | Criterion fails |
| `pass` | The tool checked and found no violation | Criterion passes, absent a failure |
| `incomplete` | Needs human review — the tool could not decide | None; appears in the trace |
| `inapplicable` | Nothing on the page to check | None |

Map a tool's "warning" or "manual check" level to `incomplete`, never to
`pass`. Claiming a pass the tool did not actually establish is how a
statement ends up overstating conformance.

## Mapping rules to criteria

If the tool reports WCAG criteria directly, use them. If it uses its own
rule ids, add a data file at `packages/core/data/rules/<name>.yaml`
following the shape of `axe.yaml`, and read it the way
`mapping/rules.ts` does. Mappings are data so that fixing one is a YAML
pull request, not a code change.

Rules with no WCAG mapping (best-practice rules) get `criteria: []`. They
are preserved and reported in the trace artifact as unmapped. Never invent
a mapping to avoid an empty array.

## Determinism

Output must be identical for identical input (FR-ART-5). In practice:

- Sort selectors and URLs.
- Iterate object keys in sorted order, not insertion order.
- Never read the clock or generate a random id.

The scaffolded test asserts this.

## The fixture

Save a **real** report from the tool. Real output contains the shapes that
break parsers — missing fields, nulls, unexpected nesting — and
hand-written JSON does not. Redact URLs and organisation names freely; the
shape is what matters.

Malformed real-world output is especially welcome as a fixture (QA-3).

## Registering it

Add the reader to `builtinReaders` in
`packages/core/src/evidence/registry.ts`, and list the format in
[evidence-formats.md](evidence-formats.md).

Library consumers can also pass readers at call time without registering
them, which is the right route for a proprietary in-house format:

```ts
loadEvidence(['in-house.json'], { readers: [myReader] });
```
