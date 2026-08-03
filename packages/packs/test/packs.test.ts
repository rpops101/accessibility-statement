import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPackDirs, renderPackFixture, readSnapshot, validate } from '../scripts/harness.js';

for (const code of listPackDirs()) {
  test(`pack ${code}: schema-valid (REQ-PACK-2)`, () => {
    const result = validate(code);
    assert.deepEqual(result.issues, [], `issues: ${JSON.stringify(result.issues)}`);
    assert.equal(result.ok, true);
  });

  test(`pack ${code}: snapshots match (QA-1) and rendering is deterministic (FR-ART-5)`, () => {
    const first = renderPackFixture(code);
    const second = renderPackFixture(code);
    for (let i = 0; i < first.rendered.length; i++) {
      const a = first.rendered[i]!;
      const b = second.rendered[i]!;
      assert.equal(a.content, b.content, `${code} ${a.lang} ${a.format}: non-deterministic render`);
      const expected = readSnapshot(a.snapshotPath);
      assert.ok(
        expected !== undefined,
        `${a.snapshotPath} missing — run: npm run update-snapshots -- ${code}`
      );
      assert.equal(
        a.content,
        expected,
        `${code} ${a.lang} ${a.format}: snapshot differs — if intentional run: npm run update-snapshots -- ${code}`
      );
    }
  });

  test(`pack ${code}: statement carries the draft watermark (FR-ART-7)`, () => {
    const { rendered } = renderPackFixture(code);
    for (const r of rendered) {
      assert.ok(
        /DRAFT|ENTWURF|PROJET|BORRADOR|BOZZA|DRÉACHT/u.test(r.content),
        `${code} ${r.lang} ${r.format}: no draft watermark found`
      );
    }
  });
}
