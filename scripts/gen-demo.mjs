// Generate the README hero image: a terminal session beside the statement
// it produces.
//
//   node scripts/gen-demo.mjs
//
// Deliberately **static**. An animated SVG is a coin flip: GitHub may strip
// the <style> element, and several renderers freeze CSS animations at t=0,
// which would show an empty terminal. The most important image in the
// repository has to render correctly everywhere, first time.
//
// SVG rather than a screenshot because the text stays selectable and
// crisp at any zoom, the file is a few KiB, and it carries a real
// accessible name and description. An image of text is the thing WCAG
// 1.4.5 tells you not to ship, and this project cannot credibly ignore
// that in its own README.
//
// The transcript is REAL output captured from the built CLI, and the
// statement panel is real rendered content. Keep it that way: a demo that
// drifts from what the tool prints is worse than no demo.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const PROMPT = '~/my-project';

const SESSION = [
  { kind: 'cmd', text: 'ls' },
  { kind: 'out', text: 'axe.json', cls: 'dim' },
  { kind: 'gap' },
  { kind: 'cmd', text: 'npx accessibility-statement init' },
  { kind: 'out', text: 'Wrote a11y-statement.config.yaml', cls: 'ok' },
  { kind: 'out', text: 'Wrote manual.yaml', cls: 'ok' },
  { kind: 'gap' },
  { kind: 'cmd', text: 'npx accessibility-statement render statement \\' },
  { kind: 'cont', text: '    --jurisdiction de --lang de \\' },
  { kind: 'cont', text: '    --out statement.html' },
  { kind: 'out', text: 'Wrote statement.html', cls: 'ok' },
  { kind: 'gap' },
  { kind: 'cmd', text: 'npx accessibility-statement check' },
  { kind: 'out', text: 'No conformance changes', cls: 'ok' },
  { kind: 'out', text: 'against the baseline.', cls: 'ok' },
];

/** The rendered statement, as it actually comes out of the DE pack. */
const STATEMENT = [
  { kind: 'draft', text: 'ENTWURF — zur menschlichen Prüfung.' },
  { kind: 'draft-2', text: 'Kein Rechtsrat; vor Veröffentlichung prüfen.' },
  { kind: 'gap' },
  { kind: 'h1', text: 'Erklärung zur Barrierefreiheit' },
  { kind: 'body', text: 'My Organisation: Diese Erklärung gilt für' },
  { kind: 'body', text: 'My Website.' },
  { kind: 'gap' },
  { kind: 'h2', text: 'Stand der Vereinbarkeit' },
  { kind: 'body', text: 'My Website ist teilweise mit den' },
  { kind: 'body', text: 'Anforderungen der EN 301 549 vereinbar.' },
  { kind: 'gap' },
  { kind: 'h2', text: 'Nicht barrierefreie Inhalte' },
  { kind: 'li', text: '1.1.1 Nicht-Text-Inhalt' },
  { kind: 'li-sub', text: 'EN 301 549 Abschnitt 9.1.1.1' },
  { kind: 'li', text: '1.4.3 Kontrast (Minimum)' },
  { kind: 'li-sub', text: 'EN 301 549 Abschnitt 9.1.4.3' },
  { kind: 'gap' },
  { kind: 'h2', text: 'Durchsetzungsverfahren' },
  { kind: 'body', text: 'Marktüberwachungsstelle der Länder (MLBF)' },
];

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- geometry ---------------------------------------------------------
const TERM_W = 460;
const DOC_W = 400;
const GAP = 22;
const PAD = 18;
const BAR = 30;
const LINE_H = 20;
const WIDTH = TERM_W + GAP + DOC_W + PAD * 2;

const termLines = SESSION.length + 1; // + trailing prompt
const docLines = STATEMENT.length;
const HEIGHT =
  PAD * 2 + BAR + 14 + Math.max(termLines, docLines) * LINE_H + 26;

// ---- terminal panel ---------------------------------------------------
const term = [];
{
  const x = PAD;
  let y = PAD + BAR + 26;
  term.push(
    `<rect x="${x}" y="${PAD}" width="${TERM_W}" height="${HEIGHT - PAD * 2}" rx="9" fill="#0d1117" stroke="#30363d"/>`,
    `<path d="M${x} ${PAD + 9}a9 9 0 0 1 9-9h${TERM_W - 18}a9 9 0 0 1 9 9v${BAR - 9}H${x}z" fill="#161b22"/>`,
    `<circle cx="${x + 18}" cy="${PAD + 15}" r="4.5" fill="#ff5f57"/>`,
    `<circle cx="${x + 34}" cy="${PAD + 15}" r="4.5" fill="#febc2e"/>`,
    `<circle cx="${x + 50}" cy="${PAD + 15}" r="4.5" fill="#28c840"/>`,
    `<text x="${x + TERM_W / 2}" y="${PAD + 19}" text-anchor="middle" class="chrome">terminal</text>`
  );

  for (const step of SESSION) {
    if (step.kind === 'gap') {
      y += LINE_H * 0.5;
      continue;
    }
    if (step.kind === 'cmd') {
      term.push(
        `<text x="${x + 14}" y="${y}" class="m"><tspan class="pr">${escapeXml(
          PROMPT
        )}</tspan><tspan class="ar"> $ </tspan><tspan class="cmd">${escapeXml(step.text)}</tspan></text>`
      );
    } else if (step.kind === 'cont') {
      term.push(`<text x="${x + 14}" y="${y}" class="m cmd">${escapeXml(step.text)}</text>`);
    } else {
      term.push(
        `<text x="${x + 14}" y="${y}" class="m ${step.cls ?? ''}">${escapeXml(step.text)}</text>`
      );
    }
    y += LINE_H;
  }
  y += LINE_H * 0.3;
  term.push(
    `<text x="${x + 14}" y="${y}" class="m"><tspan class="pr">${escapeXml(
      PROMPT
    )}</tspan><tspan class="ar"> $ </tspan></text>`
  );
}

// ---- statement panel --------------------------------------------------
const doc = [];
{
  const x = PAD + TERM_W + GAP;
  let y = PAD + BAR + 26;
  doc.push(
    `<rect x="${x}" y="${PAD}" width="${DOC_W}" height="${HEIGHT - PAD * 2}" rx="9" fill="#ffffff" stroke="#30363d"/>`,
    `<path d="M${x} ${PAD + 9}a9 9 0 0 1 9-9h${DOC_W - 18}a9 9 0 0 1 9 9v${BAR - 9}H${x}z" fill="#f0f0f0"/>`,
    `<text x="${x + DOC_W / 2}" y="${PAD + 19}" text-anchor="middle" class="chrome doc-chrome">statement.html</text>`
  );

  for (const line of STATEMENT) {
    if (line.kind === 'gap') {
      y += LINE_H * 0.45;
      continue;
    }
    if (line.kind === 'draft') {
      doc.push(
        `<rect x="${x + 12}" y="${y - 14}" width="${DOC_W - 24}" height="38" fill="#fff8e1" stroke="#8a6d00" stroke-width="2" stroke-dasharray="5 3"/>`,
        `<text x="${x + 20}" y="${y}" class="s draft">${escapeXml(line.text)}</text>`
      );
    } else if (line.kind === 'draft-2') {
      doc.push(`<text x="${x + 20}" y="${y}" class="s draft-sm">${escapeXml(line.text)}</text>`);
      y += 6;
    } else if (line.kind === 'h1') {
      doc.push(`<text x="${x + 16}" y="${y}" class="s h1">${escapeXml(line.text)}</text>`);
    } else if (line.kind === 'h2') {
      doc.push(`<text x="${x + 16}" y="${y}" class="s h2">${escapeXml(line.text)}</text>`);
    } else if (line.kind === 'li') {
      doc.push(
        `<text x="${x + 16}" y="${y}" class="s li">&#8226;</text>`,
        `<text x="${x + 28}" y="${y}" class="s li">${escapeXml(line.text)}</text>`
      );
    } else if (line.kind === 'li-sub') {
      doc.push(`<text x="${x + 28}" y="${y}" class="s li-sub">${escapeXml(line.text)}</text>`);
    } else {
      doc.push(`<text x="${x + 16}" y="${y}" class="s body">${escapeXml(line.text)}</text>`);
    }
    y += LINE_H;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-labelledby="t d">
<title id="t">Four commands turn an axe-core report into a German accessibility statement</title>
<desc id="d">Two panels. Left, a terminal: the directory contains only axe.json; "npx accessibility-statement init" writes a11y-statement.config.yaml and manual.yaml; "npx accessibility-statement render statement --jurisdiction de --lang de --out statement.html" writes statement.html; "npx accessibility-statement check" reports no conformance changes against the baseline. Right, the resulting statement.html: a dashed draft notice reading "ENTWURF — zur menschlichen Prüfung. Kein Rechtsrat; vor Veröffentlichung prüfen."; the heading "Erklärung zur Barrierefreiheit"; a compliance section stating My Website is partially compliant with EN 301 549; a non-accessible content section listing WCAG 1.1.1 Nicht-Text-Inhalt against EN 301 549 clause 9.1.1.1 and WCAG 1.4.3 Kontrast (Minimum) against clause 9.1.4.3; and an enforcement section naming the Marktüberwachungsstelle der Länder (MLBF).</desc>
<style>
text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.m{font-size:12.5px;fill:#c9d1d9}
.chrome{font-size:10.5px;fill:#8b949e}
.doc-chrome{fill:#57606a}
.pr{fill:#7ee787}
.ar{fill:#58a6ff}
.cmd{fill:#e6edf3}
.ok{fill:#7ee787}
.dim{fill:#8b949e}
.cur{fill:#58a6ff}
.s{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;fill:#1a1a1a}
.h1{font-size:15px;font-weight:700}
.h2{font-size:12.5px;font-weight:700;fill:#24292f}
.body{font-size:11.5px;fill:#24292f}
.li{font-size:11.5px;fill:#8f1919;font-weight:600}
.li-sub{font-size:10.5px;fill:#57606a}
.draft{font-size:11px;font-weight:700;fill:#5c4a00}
.draft-sm{font-size:10px;fill:#5c4a00}
</style>
<rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="#010409"/>
${term.join('\n')}
${doc.join('\n')}
</svg>
`;

mkdirSync(join(root, 'docs', 'assets'), { recursive: true });
const out = join(root, 'docs', 'assets', 'demo.svg');
writeFileSync(out, svg);
console.log(`wrote ${out} (${(svg.length / 1024).toFixed(1)} KiB, ${WIDTH}x${HEIGHT})`);
