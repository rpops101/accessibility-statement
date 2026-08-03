import type { EaaConfig, RenderedArtifact } from '../types.js';
import { resolveStrings } from '../i18n/strings.js';
import { htmlPage } from './html.js';
import { escapeHtml } from './template.js';
import { EaaKitError, DOCS_BASE } from '../util/errors.js';

/**
 * Disproportionate-burden worksheet (FR-ART-3): Article 14 EAA.
 * Structured prompts for the Annex VI criteria, micro-enterprise check and
 * the auto-computed 5-year reassessment date.
 */

/** Add five years to an ISO date, deterministically (Article 14(4)). */
export function reassessmentDate(assessmentIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(assessmentIso);
  if (!m) {
    throw new EaaKitError({
      what: `"${assessmentIso}" is not an ISO date (YYYY-MM-DD).`,
      fix: 'Set dates.burdenAssessment (or dates.preparation) in eaa.config.yaml.',
      docs: `${DOCS_BASE}/burden.md`,
    });
  }
  const year = Number(m[1]) + 5;
  let month = m[2]!;
  let day = m[3]!;
  // 29 February has no +5y equivalent; roll to 1 March.
  if (month === '02' && day === '29') {
    month = '03';
    day = '01';
  }
  return `${year}-${month}-${day}`;
}

type Micro = 'yes' | 'no' | 'unknown';

function microEnterpriseCheck(config: EaaConfig): Micro {
  const { employees, turnoverEUR } = config.organisation;
  if (employees === undefined || turnoverEUR === undefined) return 'unknown';
  return employees < 10 && turnoverEUR <= 2_000_000 ? 'yes' : 'no';
}

export interface BurdenRenderOptions {
  format: 'html' | 'md';
  lang?: string;
  reviewedBy?: string;
  reviewedOn?: string;
}

export function renderBurden(config: EaaConfig, opts: BurdenRenderOptions): RenderedArtifact {
  const lang = opts.lang ?? 'en';
  const t = resolveStrings(lang);
  const s = (path: string): string => {
    let cur: unknown = t;
    for (const p of path.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return typeof cur === 'string' ? cur : path;
  };

  const reviewed = Boolean(
    (opts.reviewedBy ?? config.review?.reviewedBy) && (opts.reviewedOn ?? config.review?.reviewedOn)
  );
  const burden = config.burden ?? { claimed: false };
  const assessmentDate = config.dates.burdenAssessment ?? config.dates.preparation;
  const due = reassessmentDate(assessmentDate);
  const micro = microEnterpriseCheck(config);
  const cb = burden.costBenefit ?? {};
  const prompts: Array<[string, string | undefined]> = [
    [s('burden.estimatedCost'), cb.estimatedCost],
    [s('burden.organisationBenefit'), cb.organisationBenefit],
    [s('burden.disabledUserImpact'), cb.disabledUserImpact],
    [s('burden.frequencyOfUse'), cb.frequencyOfUse],
  ];
  const exclusions = burden.claimed ? (burden.exclusions ?? []) : [];

  if (opts.format === 'md') {
    const lines: string[] = [];
    if (!reviewed) lines.push(`> **${s('common.draftWatermark')}**`, '');
    lines.push(`# ${s('burden.title')}`, '', `_${s('burden.subtitle')}_`, '');
    lines.push(`## ${s('burden.orgHeading')}`, '');
    lines.push(`- **${s('burden.orgHeading')}:** ${config.organisation.name}`);
    lines.push(
      `- **${s('burden.employees')}:** ${config.organisation.employees ?? '—'}`,
      `- **${s('burden.turnover')}:** ${config.organisation.turnoverEUR ?? '—'}`,
      ''
    );
    lines.push(`## ${s('burden.microHeading')}`, '', s(`burden.micro${micro === 'yes' ? 'Yes' : micro === 'no' ? 'No' : 'Unknown'}`), '');
    lines.push(`## ${s('burden.claimHeading')}`, '', s(burden.claimed ? 'burden.claimed' : 'burden.notClaimed'), '');
    if (exclusions.length > 0) {
      lines.push(`### ${s('burden.exclusionsHeading')}`, '');
      for (const e of exclusions) {
        lines.push(`- **${e.scope}**${e.reason ? ` — ${e.reason}` : ''}${e.criteria?.length ? ` (criteria: ${e.criteria.join(', ')})` : ''}`);
      }
      lines.push('');
    }
    lines.push(`## ${s('burden.costBenefitHeading')}`, '');
    for (const [label, value] of prompts) {
      lines.push(`- **${label}:** ${value ?? '_(to be completed)_'}`);
    }
    lines.push('');
    lines.push(`## ${s('burden.reassessmentHeading')}`, '');
    lines.push(`- **${s('burden.assessmentDate')}:** ${assessmentDate}`);
    lines.push(`- ${s('burden.reassessmentText')} **${due}**`, '');
    if (burden.notes) lines.push(`## ${s('burden.notesHeading')}`, '', burden.notes, '');
    return { kind: 'burden', format: 'md', lang, filenameHint: 'burden.md', content: lines.join('\n') };
  }

  const exclRows = exclusions
    .map(
      (e) =>
        `<tr><th scope="row">${escapeHtml(e.scope)}</th><td>${escapeHtml(e.reason ?? '')}</td><td>${escapeHtml((e.criteria ?? []).join(', '))}</td></tr>`
    )
    .join('\n');
  const promptRows = prompts
    .map(
      ([label, value]) =>
        `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value ?? '(to be completed)')}</td></tr>`
    )
    .join('\n');

  const body = `<h1>${escapeHtml(s('burden.title'))}</h1>
<p class="meta">${escapeHtml(s('burden.subtitle'))}</p>
<h2>${escapeHtml(s('burden.orgHeading'))}</h2>
<ul>
<li>${escapeHtml(config.organisation.name)}</li>
<li>${escapeHtml(s('burden.employees'))}: ${escapeHtml(String(config.organisation.employees ?? '—'))}</li>
<li>${escapeHtml(s('burden.turnover'))}: ${escapeHtml(String(config.organisation.turnoverEUR ?? '—'))}</li>
</ul>
<h2>${escapeHtml(s('burden.microHeading'))}</h2>
<p>${escapeHtml(s(`burden.micro${micro === 'yes' ? 'Yes' : micro === 'no' ? 'No' : 'Unknown'}`))}</p>
<h2>${escapeHtml(s('burden.claimHeading'))}</h2>
<p>${escapeHtml(s(burden.claimed ? 'burden.claimed' : 'burden.notClaimed'))}</p>
${
  exclusions.length > 0
    ? `<table>
<caption>${escapeHtml(s('burden.exclusionsHeading'))}</caption>
<thead><tr><th scope="col">Scope</th><th scope="col">Reason</th><th scope="col">Criteria</th></tr></thead>
<tbody>
${exclRows}
</tbody>
</table>`
    : ''
}
<table>
<caption>${escapeHtml(s('burden.costBenefitHeading'))}</caption>
<tbody>
${promptRows}
</tbody>
</table>
<h2>${escapeHtml(s('burden.reassessmentHeading'))}</h2>
<p>${escapeHtml(s('burden.assessmentDate'))}: ${escapeHtml(assessmentDate)}</p>
<p>${escapeHtml(s('burden.reassessmentText'))} <strong>${escapeHtml(due)}</strong></p>
${burden.notes ? `<h2>${escapeHtml(s('burden.notesHeading'))}</h2>\n<p>${escapeHtml(burden.notes)}</p>` : ''}`;

  return {
    kind: 'burden',
    format: 'html',
    lang,
    filenameHint: 'burden.html',
    content: htmlPage(body, {
      lang,
      title: s('burden.title'),
      watermark: reviewed ? undefined : s('common.draftWatermark'),
      reviewedLine: reviewed
        ? `${s('common.reviewedBy')}: ${opts.reviewedBy ?? config.review?.reviewedBy} · ${s('common.reviewedOn')}: ${opts.reviewedOn ?? config.review?.reviewedOn}`
        : undefined,
      footer: s('common.generatedBy'),
    }),
  };
}
