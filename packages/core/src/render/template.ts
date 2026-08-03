/**
 * Vendored logic-less template engine — a strict Mustache subset (NFR-9).
 *
 * Supported syntax:
 *   {{key}}          — interpolate, HTML-escaped
 *   {{{key}}}        — interpolate raw (core-authored values only; packs
 *                      should not need it, and pack lint warns on it)
 *   {{#key}}...{{/key}} — section: iterate arrays, descend into objects,
 *                      render once for other truthy values
 *   {{^key}}...{{/key}} — inverted section: render when falsy/empty
 *   {{.}}            — the current scalar in an array section
 *   dotted.paths     — lookup through nested objects
 *   {{! comment }}   — dropped
 *
 * Deliberately NOT supported: lambdas, partials, custom delimiters,
 * expression evaluation of any kind. Pack templates are data, not code —
 * this closes the template-injection attack surface.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Ctx = unknown[];

const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

function lookup(ctx: Ctx, path: string): unknown {
  if (path === '.') return ctx[ctx.length - 1];
  const parts = path.split('.');
  for (let i = ctx.length - 1; i >= 0; i--) {
    let cur: unknown = ctx[i];
    if (cur === null || typeof cur !== 'object') continue;
    // Own properties only: a template must never be able to walk the
    // prototype chain (`{{constructor}}`, `{{__proto__}}`) out of its data.
    if (!hasOwn(cur, parts[0]!)) continue;
    for (const part of parts) {
      if (cur === null || typeof cur !== 'object' || !hasOwn(cur, part)) return undefined;
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
  }
  return undefined;
}

function truthy(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v === '' || v === 0) return false;
  return true;
}

type Node =
  | { t: 'text'; value: string }
  | { t: 'var'; key: string; raw: boolean }
  | { t: 'section'; key: string; inverted: boolean; children: Node[] };

const TAG_RE = /\{\{\{?\s*([^}]*?)\s*\}?\}\}/g;

export function parseTemplate(src: string): Node[] {
  const root: Node[] = [];
  const stack: Array<{ key: string; nodes: Node[] }> = [{ key: '', nodes: root }];
  let last = 0;
  for (const m of src.matchAll(TAG_RE)) {
    const idx = m.index!;
    if (idx > last) {
      stack[stack.length - 1]!.nodes.push({ t: 'text', value: src.slice(last, idx) });
    }
    last = idx + m[0].length;
    const raw = m[0].startsWith('{{{');
    const tag = m[1]!.trim();
    if (tag.startsWith('!')) continue; // comment
    if (tag.startsWith('#') || tag.startsWith('^')) {
      const key = tag.slice(1).trim();
      const section: Node = { t: 'section', key, inverted: tag.startsWith('^'), children: [] };
      stack[stack.length - 1]!.nodes.push(section);
      stack.push({ key, nodes: section.children });
    } else if (tag.startsWith('/')) {
      const key = tag.slice(1).trim();
      const top = stack.pop();
      if (!top || top.key !== key) {
        throw new Error(`Template error: closing {{/${key}}} does not match open section${top ? ` {{#${top.key}}}` : ''}`);
      }
    } else {
      stack[stack.length - 1]!.nodes.push({ t: 'var', key: tag, raw });
    }
  }
  if (stack.length !== 1) {
    throw new Error(`Template error: unclosed section {{#${stack[stack.length - 1]!.key}}}`);
  }
  if (last < src.length) {
    root.push({ t: 'text', value: src.slice(last) });
  }
  return root;
}

function renderNodes(nodes: Node[], ctx: Ctx): string {
  let out = '';
  for (const node of nodes) {
    if (node.t === 'text') {
      out += node.value;
    } else if (node.t === 'var') {
      const v = lookup(ctx, node.key);
      if (v === undefined || v === null) continue;
      const s = typeof v === 'string' ? v : String(v);
      out += node.raw ? s : escapeHtml(s);
    } else {
      const v = lookup(ctx, node.key);
      if (node.inverted) {
        if (!truthy(v)) out += renderNodes(node.children, ctx);
      } else if (Array.isArray(v)) {
        for (const item of v) out += renderNodes(node.children, [...ctx, item]);
      } else if (truthy(v)) {
        // Non-array truthy values become the current context ({{.}}),
        // matching Mustache section semantics for scalars and objects.
        out += renderNodes(node.children, [...ctx, v]);
      }
    }
  }
  return out;
}

/** Render a template with a data context. Throws on malformed templates. */
export function renderTemplate(src: string, data: unknown): string {
  return renderNodes(parseTemplate(src), [data]);
}

/** Lint a pack template: returns warnings (e.g. raw triple-stache usage). */
export function lintTemplate(src: string): string[] {
  const warnings: string[] = [];
  if (/\{\{\{/.test(src)) {
    warnings.push('uses raw {{{...}}} interpolation — pack templates should use escaped {{...}}');
  }
  try {
    parseTemplate(src);
  } catch (e) {
    warnings.push((e as Error).message);
  }
  return warnings;
}
