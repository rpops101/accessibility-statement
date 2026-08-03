// Marks the CJS build output as CommonJS so Node resolves it correctly
// from a `"type": "module"` package.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(
  join(here, '..', 'dist', 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2) + '\n'
);
