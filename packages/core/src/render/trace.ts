import type { ConformanceModel, EaaConfig, RenderedArtifact } from '../types.js';
import { resolveStrings } from '../i18n/strings.js';
import { htmlPage } from './html.js';
import { escapeHtml } from './template.js';
import { stableJson } from '../util/stable.js';

/**
 * Traceability artifact (FR-MAP-3): criterion → clause → evidence file →
 * rule → selector/URL. Emittable as md, html and json.
 */

export interface TraceRenderOptions {
  format: 'html' | 'md' | 'json';
  lang?: string;
}

export function renderTrace(
  conformance: ConformanceModel,
  config: EaaConfig,
  opts: TraceRenderOptions
): RenderedArtifact {
  const lang = opts.lang ?? 'en';
  const t = resolveStrings(lang);
  const s = (path: string): string => {
    let cur: unknown = t;
    for (const p of path.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return typeof cur === 'string' ? cur : path;
  };

  if (opts.format === 'json') {
    return {
      kind: 'trace',
      format: 'json',
      lang,
      filenameHint: 'trace.json',
      content: stableJson({
        product: config.product.name,
        wcagVersion: conformance.wcagVersion,
        enVersion: conformance.enVersion,
        summary: conformance.summary,
        urls: conformance.urls,
        criteria: conformance.results.map((r) => ({
          criterion: r.criterion.id,
          name: r.criterion.name,
          level: r.criterion.level,
          clause: r.clause ?? null,
          status: r.status,
          decidedBy: r.decidedBy,
          conflicts: r.conflicts.map((c) => c.description),
          evidence: r.trace.map((e) => ({
            source: e.source,
            file: e.file ?? null,
            ruleId: e.ruleId ?? null,
            outcome: e.outcome,
            urls: e.urls,
            selectors: e.selectors,
            message: e.message ?? null,
          })),
        })),
        unmapped: conformance.unmappedFindings.map((f) => ({
          ruleId: f.ruleId,
          source: f.source,
          outcome: f.outcome,
          url: f.url ?? null,
          selectors: f.selectors,
        })),
      }),
    };
  }

  const conflicts = conformance.results.flatMap((r) => r.conflicts);

  if (opts.format === 'md') {
    const lines: string[] = [];
    lines.push(`# ${s('trace.title')}`, '', s('trace.intro'), '');
    lines.push(
      `- **Product:** ${config.product.name}`,
      `- **WCAG:** ${conformance.wcagVersion} · **EN 301 549:** ${conformance.enVersion}`,
      `- **Summary:** ${Object.entries(conformance.summary.totals)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}`,
      ''
    );
    if (conflicts.length > 0) {
      lines.push(`## ${s('trace.conflictsHeading')}`, '', s('trace.conflictsIntro'), '');
      for (const c of conflicts) lines.push(`- **${c.criterion}** — ${c.description}`);
      lines.push('');
    }
    lines.push(
      `| ${s('trace.criterion')} | ${s('trace.clause')} | ${s('trace.statusLabel')} | ${s('trace.decidedBy')} | ${s('trace.evidenceLabel')} |`
    );
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of conformance.results) {
      const evidence = r.trace
        .map((e) => {
          const parts = [e.source];
          if (e.ruleId) parts.push(e.ruleId);
          if (e.file) parts.push(e.file);
          if (e.urls.length > 0) parts.push(e.urls.join(' '));
          if (e.selectors.length > 0) parts.push(`\`${e.selectors.slice(0, 3).join('`, `')}\``);
          return `${parts.join(' · ')} → ${e.outcome}`;
        })
        .join('<br>');
      lines.push(
        `| ${r.criterion.id} ${r.criterion.name} | ${r.clause ?? '—'} | ${r.status} | ${s(`trace.decidedByValues.${r.decidedBy}`)} | ${evidence || '—'} |`
      );
    }
    lines.push('');
    if (conformance.unmappedFindings.length > 0) {
      lines.push(`## ${s('trace.unmappedHeading')}`, '', s('trace.unmappedIntro'), '');
      for (const f of conformance.unmappedFindings) {
        lines.push(`- ${f.source} · ${f.ruleId} → ${f.outcome}${f.url ? ` (${f.url})` : ''}`);
      }
      lines.push('');
    }
    return { kind: 'trace', format: 'md', lang, filenameHint: 'trace.md', content: lines.join('\n') };
  }

  const rows = conformance.results
    .map((r) => {
      const evidence = r.trace
        .map((e) => {
          const parts = [e.source];
          if (e.ruleId) parts.push(`<code>${escapeHtml(e.ruleId)}</code>`);
          if (e.file) parts.push(escapeHtml(e.file));
          if (e.urls.length > 0) parts.push(escapeHtml(e.urls.join(' ')));
          if (e.selectors.length > 0)
            parts.push(e.selectors.slice(0, 3).map((sel) => `<code>${escapeHtml(sel)}</code>`).join(', '));
          return `${parts.join(' · ')} → ${escapeHtml(e.outcome)}`;
        })
        .join('<br>');
      return (
        `<tr><th scope="row">${escapeHtml(`${r.criterion.id} ${r.criterion.name}`)}</th>` +
        `<td>${escapeHtml(r.clause ?? '—')}</td>` +
        `<td class="${r.status === 'fail' || r.status === 'partial' ? 'status-fail' : 'status-pass'}">${escapeHtml(r.status)}</td>` +
        `<td>${escapeHtml(s(`trace.decidedByValues.${r.decidedBy}`))}</td>` +
        `<td>${evidence || '—'}</td></tr>`
      );
    })
    .join('\n');

  const conflictsHtml =
    conflicts.length > 0
      ? `<h2>${escapeHtml(s('trace.conflictsHeading'))}</h2>
<p>${escapeHtml(s('trace.conflictsIntro'))}</p>
<ul>
${conflicts.map((c) => `<li><strong>${escapeHtml(c.criterion)}</strong> — ${escapeHtml(c.description)}</li>`).join('\n')}
</ul>`
      : '';

  const unmappedHtml =
    conformance.unmappedFindings.length > 0
      ? `<h2>${escapeHtml(s('trace.unmappedHeading'))}</h2>
<p>${escapeHtml(s('trace.unmappedIntro'))}</p>
<ul>
${conformance.unmappedFindings.map((f) => `<li>${escapeHtml(`${f.source} · ${f.ruleId} → ${f.outcome}${f.url ? ` (${f.url})` : ''}`)}</li>`).join('\n')}
</ul>`
      : '';

  const body = `<h1>${escapeHtml(s('trace.title'))}</h1>
<p>${escapeHtml(s('trace.intro'))}</p>
<p class="meta">${escapeHtml(config.product.name)} · WCAG ${escapeHtml(conformance.wcagVersion)} · EN 301 549 ${escapeHtml(conformance.enVersion)}</p>
${conflictsHtml}
<table>
<caption>${escapeHtml(s('trace.title'))}</caption>
<thead><tr><th scope="col">${escapeHtml(s('trace.criterion'))}</th><th scope="col">${escapeHtml(s('trace.clause'))}</th><th scope="col">${escapeHtml(s('trace.statusLabel'))}</th><th scope="col">${escapeHtml(s('trace.decidedBy'))}</th><th scope="col">${escapeHtml(s('trace.evidenceLabel'))}</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
${unmappedHtml}`;

  return {
    kind: 'trace',
    format: 'html',
    lang,
    filenameHint: 'trace.html',
    content: htmlPage(body, {
      lang,
      title: s('trace.title'),
      footer: s('common.generatedBy'),
    }),
  };
}
