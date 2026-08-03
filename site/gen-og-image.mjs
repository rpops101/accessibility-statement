/**
 * Generate the Open Graph share image.
 *
 *   node site/gen-og-image.mjs      # writes site/public/og.png
 *
 * Run this by hand when the wording changes and commit the result. It is not
 * part of the build: rasterising needs a browser, and requiring one to build
 * the site would mean a contributor downloads Chromium to change a heading.
 *
 * 1200x630 is the size every social platform crops from. SVG is not accepted
 * as an og:image by most of them, which is why this exists as a PNG at all.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'site', 'public', 'og.png');

// Deliberately plain: high contrast, large type, no decoration that turns to
// mush at thumbnail size. Colours match the site's light theme.
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    color: #16191d;
    display: flex; flex-direction: column; justify-content: center;
    padding: 72px 80px;
    border-bottom: 18px solid #0a4f9c;
  }
  .eyebrow { font-size: 26px; font-weight: 600; color: #0a4f9c; letter-spacing: .02em; }
  h1 { font-size: 76px; line-height: 1.08; margin: 22px 0 26px; letter-spacing: -.02em; }
  p { font-size: 31px; line-height: 1.35; color: #3d444b; max-width: 30ch; }
  .row { display: flex; gap: 14px; margin-top: 38px; flex-wrap: wrap; align-items: center; }
  .tag {
    font-size: 22px; font-weight: 600; padding: 9px 18px; border-radius: 999px;
    background: #eef3f9; color: #0a4f9c; border: 2px solid #cddcec;
  }
  .foot { margin-top: 34px; font-size: 25px; color: #4b5259; font-family: ui-monospace, Menlo, Consolas, monospace; }
</style></head><body>
  <div class="eyebrow">European Accessibility Act</div>
  <h1>Accessibility Statement Generator</h1>
  <p>Free and open source. Runs in your browser — nothing is uploaded.</p>
  <div class="row">
    <span class="tag">National EU formats</span>
    <span class="tag">VPAT&nbsp;2.5 / OpenACR</span>
    <span class="tag">EN&nbsp;301&nbsp;549</span>
  </div>
  <div class="foot">npx accessibility-statement</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
const buffer = await page.screenshot({ type: 'png' });
await browser.close();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buffer);
console.log(`wrote ${out} (${(buffer.length / 1024).toFixed(1)} KiB, 1200x630)`);
