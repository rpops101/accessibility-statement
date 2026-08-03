# Security policy

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](../../security/advisories/new). We acknowledge within 72 hours and aim to ship a fix or a mitigation within 14 days.

Please do not open a public issue for a vulnerability first.

## Threat model

eaa-kit reads local files and writes local files. It has no network access, no daemon, no database and no credentials. That removes most of the usual surface. What remains:

| Surface | Control |
| --- | --- |
| **Contributed pack templates** | Templates are logic-less: sections and variables only, no expression evaluation, own-property lookup only (a template cannot reach the prototype chain). A pack cannot execute code. This is the one attack surface the design must close, and it is closed by construction rather than by review. |
| **Untrusted evidence files** | All input is schema-validated. Readers must `detect()` strictly and never guess a format. Malformed JSON produces an actionable error, not a crash — the fixture corpus includes deliberately broken inputs. |
| **Supply chain** | `@eaa-kit/core` has **one** runtime dependency, justified in [DEPENDENCIES.md](packages/core/DEPENDENCIES.md). Small utilities are vendored rather than depended on. Dependency additions need explicit justification in review. |
| **Output** | Generated HTML escapes all interpolated values and is self-contained: no scripts, no remote assets, no `@import`. Enforced by tests. |

## What is not a vulnerability

- **A wrong legal reference in a jurisdiction pack.** Serious, and we want to hear about it — please open a normal issue so it can be fixed in public. Every artifact carries a draft watermark and requires human sign-off precisely because packs can be wrong.
- **eaa-kit reporting a criterion as unevaluated.** That is the tool being honest about what the evidence supports.

## Supported versions

The latest minor release receives security fixes. Given the project's release cadence, upgrading is normally a patch bump.
