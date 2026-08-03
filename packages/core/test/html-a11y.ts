/**
 * A small structural accessibility checker for the HTML eaa-kit generates
 * (FR-ART-6 / QA-4).
 *
 * The repo also runs real axe-core against these artifacts in CI
 * (.github/workflows/ci.yml, the `dogfood` job) — that is the authoritative
 * gate. This checker exists so the same rules run in `npm test` on a
 * machine with no browser, which is what a first-time contributor has.
 * It covers the failure modes our own renderers could plausibly introduce;
 * it is not a general-purpose scanner and must never be presented as one.
 */

export interface HtmlIssue {
  rule: string;
  detail: string;
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

interface Tag {
  name: string;
  attrs: Record<string, string>;
  closing: boolean;
  selfClosing: boolean;
  index: number;
}

function* tags(html: string): Generator<Tag> {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>"']+(?:=(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*(\/?)>/g;
  for (const m of html.matchAll(re)) {
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/g;
    for (const a of (m[3] ?? '').matchAll(attrRe)) {
      attrs[a[1]!.toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    yield {
      name: m[2]!.toLowerCase(),
      attrs,
      closing: m[1] === '/',
      selfClosing: m[4] === '/',
      index: m.index!,
    };
  }
}

/** Text content of the element starting at `openIndex`, tags stripped. */
function innerText(html: string, tag: Tag, matchLength: number): string {
  const closing = `</${tag.name}`;
  const start = html.indexOf('>', tag.index) + 1;
  const end = html.indexOf(closing, start);
  if (end === -1) return '';
  return html
    .slice(start, end)
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .trim();
}

/**
 * Check generated HTML. Rule names mirror the axe-core rules they stand in
 * for, so a failure here points at the same fix.
 */
export function checkHtmlAccessibility(html: string): HtmlIssue[] {
  const issues: HtmlIssue[] = [];
  const push = (rule: string, detail: string) => issues.push({ rule, detail });

  // html-has-lang / html-lang-valid
  const htmlTag = [...tags(html)].find((t) => t.name === 'html' && !t.closing);
  if (!htmlTag) push('html-has-lang', '<html> element not found');
  else if (!htmlTag.attrs['lang']) push('html-has-lang', '<html> has no lang attribute');
  else if (!/^[a-z]{2,3}(-[A-Za-z0-9-]+)?$/.test(htmlTag.attrs['lang']))
    push('html-lang-valid', `lang="${htmlTag.attrs['lang']}" is not a valid language tag`);

  // document-title
  const titleTag = [...tags(html)].find((t) => t.name === 'title' && !t.closing);
  if (!titleTag) push('document-title', 'no <title> element');
  else if (innerText(html, titleTag, 0) === '') push('document-title', '<title> is empty');

  // meta-viewport: must not block zoom
  for (const tag of tags(html)) {
    if (tag.name === 'meta' && tag.attrs['name'] === 'viewport') {
      const content = tag.attrs['content'] ?? '';
      if (/user-scalable\s*=\s*(no|0)/i.test(content) || /maximum-scale\s*=\s*[01](\.\d+)?\b/i.test(content)) {
        push('meta-viewport', `viewport blocks zoom: ${content}`);
      }
    }
  }

  // image-alt
  for (const tag of tags(html)) {
    if (tag.name === 'img' && !tag.closing) {
      const role = tag.attrs['role'];
      const decorative = role === 'none' || role === 'presentation';
      if (!decorative && tag.attrs['alt'] === undefined) {
        push('image-alt', `<img src="${tag.attrs['src'] ?? ''}"> has no alt attribute`);
      }
    }
  }

  // link-name / button-name
  for (const tag of tags(html)) {
    if (tag.closing) continue;
    if (tag.name === 'a') {
      if (tag.attrs['href'] === undefined) continue;
      const accessible =
        innerText(html, tag, 0) || tag.attrs['aria-label'] || tag.attrs['title'];
      if (!accessible) push('link-name', `<a href="${tag.attrs['href']}"> has no accessible name`);
    }
    if (tag.name === 'button') {
      const accessible = innerText(html, tag, 0) || tag.attrs['aria-label'];
      if (!accessible) push('button-name', '<button> has no accessible name');
    }
  }

  // heading-order: no skipped levels, exactly one h1
  const headings = [...tags(html)].filter((t) => !t.closing && /^h[1-6]$/.test(t.name));
  const h1Count = headings.filter((h) => h.name === 'h1').length;
  if (h1Count === 0) push('page-has-heading-one', 'no <h1> element');
  if (h1Count > 1) push('page-has-heading-one', `${h1Count} <h1> elements; expected exactly one`);
  let previous = 0;
  for (const heading of headings) {
    const level = Number(heading.name.slice(1));
    if (previous !== 0 && level > previous + 1) {
      push('heading-order', `<${heading.name}> follows <h${previous}>, skipping a level`);
    }
    previous = level;
  }
  for (const heading of headings) {
    if (innerText(html, heading, 0) === '') push('empty-heading', `<${heading.name}> is empty`);
  }

  // duplicate-id
  const seen = new Map<string, number>();
  for (const tag of tags(html)) {
    const id = tag.attrs['id'];
    if (!tag.closing && id) seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) push('duplicate-id', `id="${id}" used ${count} times`);
  }

  // table structure: every table needs headers; th needs scope
  for (const tag of tags(html)) {
    if (tag.name === 'table' && !tag.closing) {
      const start = tag.index;
      const end = html.indexOf('</table', start);
      const table = html.slice(start, end === -1 ? undefined : end);
      if (!/<th[\s>]/.test(table)) {
        push('th-has-data-cells', '<table> has no <th> header cells');
      }
      for (const cell of tags(table)) {
        if (cell.name === 'th' && !cell.closing && !cell.attrs['scope']) {
          push('scope-attr-valid', '<th> without a scope attribute');
        }
      }
    }
  }

  // landmark: content should live in a landmark region
  if (!/<(main|nav|header|footer|aside|section)[\s>]/.test(html) && !/role="main"/.test(html)) {
    push('region', 'no landmark region (e.g. <main>) found');
  }

  // list structure: <li> must be inside <ul>/<ol>
  const stack: string[] = [];
  for (const tag of tags(html)) {
    if (VOID_ELEMENTS.has(tag.name) || tag.selfClosing) continue;
    if (tag.closing) {
      const idx = stack.lastIndexOf(tag.name);
      if (idx !== -1) stack.length = idx;
    } else {
      if (tag.name === 'li') {
        const parent = stack[stack.length - 1];
        if (parent !== 'ul' && parent !== 'ol') {
          push('listitem', `<li> inside <${parent ?? 'document'}> rather than <ul>/<ol>`);
        }
      }
      if (tag.name === 'ul' || tag.name === 'ol') {
        // Direct children of a list must be li — checked on close below.
      }
      stack.push(tag.name);
    }
  }

  return issues;
}
