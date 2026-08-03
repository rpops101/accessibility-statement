# @eaa-kit/packs

Jurisdiction packs for [eaa-kit](https://github.com/rpops101/eaa-kit): the
per-member-state accessibility-statement formats, translations, legal
references and enforcement-body details.

**This package is data. It contains no code.**

It is versioned separately from `@eaa-kit/core` so that a translation
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

`eaa-kit` finds this package automatically when both are installed. Point
elsewhere with `--packs-dir` or `EAA_KIT_PACKS_DIR`.

## Adding your country

This is the contribution the project most needs, and you can do it without
reading a line of the engine:

```bash
npx eaa-kit contrib scaffold-pack --country pt
```

See [docs/packs.md](../../docs/packs.md) and
[CONTRIBUTING.md](../../CONTRIBUTING.md).

## Validating

```bash
npx eaa-kit validate-pack packages/packs/packs/de   # one
npx eaa-kit validate-pack                           # all
npm run update-snapshots -w @eaa-kit/packs -- de    # regenerate snapshots
```

## Legal accuracy

Every pack cites official sources in `pack.yaml`. If you find a wrong
enforcement body or a stale legal reference, please
[open an issue](https://github.com/rpops101/eaa-kit/issues/new/choose) —
those reports matter more to us than feature requests.

Generated artifacts carry a draft watermark and require named human
sign-off. eaa-kit does not provide legal advice.

## Licence

MIT.
