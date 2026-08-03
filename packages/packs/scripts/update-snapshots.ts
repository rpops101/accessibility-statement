// Regenerate expected-output snapshots for every pack (or one pack:
//   npm run update-snapshots -- de
import { listPackDirs, updateSnapshots } from './harness.js';

const only = process.argv[2];
for (const code of listPackDirs()) {
  if (only && code !== only) continue;
  for (const path of updateSnapshots(code)) {
    console.log(`wrote ${path}`);
  }
}
