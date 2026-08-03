// Print a stable SHA-256 manifest of a directory tree.
//
//   node scripts/hash-dir.mjs <dir>
//
// Used by the cross-platform determinism check. Doing this in Node rather
// than with `find | xargs shasum` matters for two reasons: shasum does not
// exist on the Windows runners, and the path separator would otherwise make
// the manifests differ on Windows even when every byte of every file is
// identical. Paths are normalised to forward slashes for exactly that
// reason.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'corpus-out');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const lines = [];
for (const file of walk(root)) {
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  lines.push(`${hash}  ${relative(root, file).split(sep).join('/')}`);
}

// Sort by path so directory iteration order cannot affect the manifest.
lines.sort((a, b) => (a.slice(66) < b.slice(66) ? -1 : 1));
process.stdout.write(lines.join('\n') + '\n');
