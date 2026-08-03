# Runtime dependency justification — `@eaa-kit/core`

Policy (NFR-2): at most **5** runtime dependencies, each justified here.
Small utilities are vendored in `src/util/` and `src/render/template.ts`
instead of adding dependencies.

| Dependency | Why it is a dependency and not vendored |
| --- | --- |
| `yaml` (^2, zero transitive deps) | All human-edited data in eaa-kit is YAML (config, manual checklist, mapping tables, jurisdiction packs, OpenACR output). A correct YAML 1.2 parser/serializer is far too large and too security-sensitive to vendor. `yaml` has no transitive dependencies. |

## Vendored instead of depended on

| Concern | Where | Why |
| --- | --- | --- |
| Logic-less templating (Mustache subset) | `src/render/template.ts` | Pack templates must be data, not code (NFR-9). A ~150-line renderer with no expression evaluation closes the template-injection surface and avoids a dependency. |
| JSON-Schema-subset validation | `src/util/microschema.ts` | We validate our own schemas (pack, config, manual checklist). Supporting the subset we author (type/required/properties/items/enum/pattern) takes ~150 lines; `ajv` would bring code generation (`new Function`) into a compliance tool. |
| Stable serialization / stable sort | `src/util/stable.ts` | Determinism (FR-ART-5) requires byte-identical output; owning the serializer is the point. |

Dev dependencies are unconstrained by NFR-2 (they never ship).
