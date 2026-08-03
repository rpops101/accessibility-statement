// Emits schemas/a11y-statement.config.schema.json from the schema the engine actually
// validates against, so editor autocomplete can never drift from runtime
// behaviour.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { CONFIG_SCHEMA } = await import(join(root, 'packages/core/dist/esm/index.js'));

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/rpops101/accessibility-statement/blob/main/schemas/a11y-statement.config.schema.json',
  title: 'accessibility-statement project configuration (a11y-statement.config.yaml)',
  ...CONFIG_SCHEMA,
};

mkdirSync(join(root, 'schemas'), { recursive: true });
writeFileSync(join(root, 'schemas', 'a11y-statement.config.schema.json'), JSON.stringify(schema, null, 2) + '\n');
console.log('wrote schemas/a11y-statement.config.schema.json');
