# @accessibility-statement/packs

Jurisdiction packs for [accessibility-statement](https://github.com/rpops101/accessibility-statement): the
per-member-state accessibility-statement formats, translations, legal
references and enforcement-body details.

**This package is data. It contains no code.**

It is versioned separately from `@accessibility-statement/core` so that a translation
release never has to bump the engine.

## Contents

```
packs/
├── eu/     European Union (generic model statement)
├── de/     Germany
├── es/     Spain
├── fr/     France
├── ie/     Ireland
└── it/     Italy
schema/
└── pack.schema.json    JSON Schema for pack.yaml
```

`accessibility-statement` finds this package automatically when both are installed. Point
elsewhere with `--packs-dir` or `A11Y_STATEMENT_PACKS_DIR`.

## Adding your country

This is the contribution the project most needs, and you can do it without
reading a line of the engine:

```bash
npx accessibility-statement contrib scaffold-pack --country pt
```

See [docs/packs.md](../../docs/packs.md) and
[CONTRIBUTING.md](../../CONTRIBUTING.md).

## Validating

```bash
npx accessibility-statement validate-pack packages/packs/packs/de   # one
npx accessibility-statement validate-pack                           # all
npm run update-snapshots -w @accessibility-statement/packs -- de    # regenerate snapshots
```

## Legal accuracy

Every pack cites official sources in `pack.yaml`. If you find a wrong
enforcement body or a stale legal reference, please
[open an issue](https://github.com/rpops101/accessibility-statement/issues/new/choose) —
those reports matter more to us than feature requests.

Generated artifacts carry a draft watermark and require named human
sign-off. accessibility-statement does not provide legal advice.

## Licence

MIT.
