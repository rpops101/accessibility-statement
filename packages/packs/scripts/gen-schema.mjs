// Mirrors packages/core/data/pack.schema.yaml (the source of truth) into
// schema/pack.schema.json for editors and external validators.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'core', 'data', 'pack.schema.yaml');
const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/rpops101/eaa-kit/blob/main/packages/packs/schema/pack.schema.json',
  title: 'eaa-kit jurisdiction pack metadata (pack.yaml)',
  ...parse(readFileSync(src, 'utf8')),
};
writeFileSync(join(here, '..', 'schema', 'pack.schema.json'), JSON.stringify(schema, null, 2) + '\n');
console.log('wrote schema/pack.schema.json');
