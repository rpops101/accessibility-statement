// Portable test runner: executes every test/*.test.ts of the calling
// package in its own process via `node --import tsx`.
//
// We do not use `node --test <glob>` because some distro-patched Node
// builds ship without the internal glob dependency it needs, which makes
// the flag unusable on those machines. Executing the files directly uses
// the same node:test harness and reporter.
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = resolve(process.argv[2] ?? 'test');
let files;
try {
  files = readdirSync(dir)
    .filter((f) => f.endsWith('.test.ts'))
    .sort();
} catch {
  console.error(`No test directory at ${dir}`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`No *.test.ts files in ${dir}`);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', join(dir, file)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) failed++;
}
process.exit(failed === 0 ? 0 : 1);
