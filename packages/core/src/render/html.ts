import { escapeHtml } from './template.js';

/**
 * Base CSS shared by core-rendered HTML artifacts (ACR, burden, trace).
 * Self-contained (FR-ART-1): no external assets, no scripts, prints well.
 * Colors keep ≥ 4.5:1 contrast — the tool dogfoods WCAG (FR-ART-6).
 */
export const BASE_CSS = `
:root { color-scheme: light; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  margin: 0 auto; max-width: 52rem; padding: 1.5rem; line-height: 1.6;
  color: #1a1a1a; background: #ffffff; }
h1 { font-size: 1.6rem; line-height: 1.3; }
h2 { font-size: 1.25rem; margin-top: 2rem; }
h3 { font-size: 1.05rem; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
caption { text-align: left; font-weight: 600; margin-bottom: .5rem; }
th, td { border: 1px solid #767676; padding: .4rem .6rem; text-align: left;
  vertical-align: top; }
th { background: #f0f0f0; }
code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: .875em; background: #f0f0f0; padding: .1em .3em; border-radius: 3px; }
a { color: #084d99; }
.watermark { border: 3px dashed #8a6d00; background: #fff8e1; color: #5c4a00;
  padding: .75rem 1rem; margin: 0 0 1.5rem; font-weight: 600; }
.reviewed { border-left: 4px solid #1a6b2f; background: #f0f7f1; color: #143d1f;
  padding: .5rem 1rem; margin: 0 0 1.5rem; }
.status-fail { font-weight: 600; color: #8f1919; }
.status-pass { color: #14571f; }
.meta { color: #444444; font-size: .9rem; }
footer { margin-top: 3rem; border-top: 1px solid #767676; padding-top: 1rem;
  color: #444444; font-size: .875rem; }
@media print { body { max-width: none; } .watermark { break-inside: avoid; } }
`.trim();

export interface HtmlPageOptions {
  lang: string;
  title: string;
  /** Draft watermark text, or undefined when reviewed. */
  watermark?: string;
  /** "Reviewed by X on Y" line shown when the watermark is removed. */
  reviewedLine?: string;
  footer?: string;
}

/** Wrap body markup in a self-contained, accessible HTML document. */
export function htmlPage(body: string, opts: HtmlPageOptions): string {
  const banner = opts.watermark
    ? `<div class="watermark" role="note">${escapeHtml(opts.watermark)}</div>\n`
    : opts.reviewedLine
      ? `<p class="reviewed">${escapeHtml(opts.reviewedLine)}</p>\n`
      : '';
  const footer = opts.footer ? `<footer>${escapeHtml(opts.footer)}</footer>\n` : '';
  return `<!DOCTYPE html>
<html lang="${escapeHtml(opts.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>
${BASE_CSS}
</style>
</head>
<body>
<main>
${banner}${body}
${footer}</main>
</body>
</html>
`;
}
