import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';

const base = join(dirname(dirname(fileURLToPath(import.meta.url))), 'data', 'standards') + '/';
const w21 = YAML.parse(readFileSync(base + 'wcag-2.1.yaml', 'utf8'));

const cmp = (a, b) => {
  const as = a.id.split('.').map(Number), bs = b.id.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (as[i] !== bs[i]) return as[i] - bs[i];
  return 0;
};

// ---- WCAG 2.2 ----
const added = [
  { id: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: 'AA', automation: 'none',
    manualGuidance: 'Tab through the page; verify no focused component is entirely hidden by sticky headers, footers or other author-created overlays.' },
  { id: '2.5.7', name: 'Dragging Movements', level: 'AA', automation: 'none',
    manualGuidance: 'For every dragging interaction, verify a single-pointer alternative that does not require dragging.' },
  { id: '2.5.8', name: 'Target Size (Minimum)', level: 'AA', automation: 'partial',
    manualGuidance: 'Verify pointer targets are at least 24x24 CSS pixels, or have sufficient spacing or an equivalent larger target.' },
  { id: '3.2.6', name: 'Consistent Help', level: 'A', automation: 'none',
    manualGuidance: 'Confirm help mechanisms (contact details, chat, FAQ) appear in the same relative order across pages.' },
  { id: '3.3.7', name: 'Redundant Entry', level: 'A', automation: 'none',
    manualGuidance: 'Verify information already entered in the same process is auto-populated or selectable rather than asked again.' },
  { id: '3.3.8', name: 'Accessible Authentication (Minimum)', level: 'AA', automation: 'none',
    manualGuidance: 'Verify authentication never requires a cognitive function test (memorization, transcription) unless an alternative or assistance exists; pasting and password managers must work.' },
];
const w22criteria = w21.criteria.filter((c) => c.id !== '4.1.1').concat(added).sort(cmp);
const w22 = { id: 'wcag-2.2', version: '2.2', criteria: w22criteria };
const w22header = `# WCAG 2.2 success criteria, levels A and AA.
# Derived from wcag-2.1.yaml: 4.1.1 Parsing is removed in WCAG 2.2; six new
# A/AA criteria are added (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8).
# See wcag-2.1.yaml for the meaning of \`automation\` and \`manualGuidance\`.
`;
writeFileSync(base + 'wcag-2.2.yaml', w22header + YAML.stringify(w22));

// ---- EN 301 549 v3.2.1 ----
const clauses = w21.criteria
  .slice()
  .sort(cmp)
  .map((c) => ({ id: `9.${c.id}`, title: c.name, chapter: 9, wcag: c.id }));
const en = {
  id: 'en301549-3.2.1',
  version: '3.2.1',
  wcagVersion: '2.1',
  reservedChapters: [5, 6, 7, 8, 10, 11, 12, 13],
  clauses,
};
const enHeader = `# EN 301 549 v3.2.1 — web clauses (chapter 9).
# Chapter 9 mirrors WCAG 2.1 A/AA numbering: clause 9.x.y.z corresponds to
# WCAG success criterion x.y.z (Table A.1 of the standard).
# Chapters 5-8 (generic/hardware), 10 (non-web documents), 11 (software),
# 12 (documentation/support) and 13 (relay/emergency) are reserved for future
# packs/readers (FR-MAP-5) — adding them is a data-only change.
# When EN 301 549 v4.1.1 (WCAG 2.2) publishes, add en301549-4.1.1.yaml as a
# new file; do not edit this one (FR-MAP-4).
`;
writeFileSync(base + 'en301549-3.2.1.yaml', enHeader + YAML.stringify(en));
console.log('wrote wcag-2.2.yaml (' + w22criteria.length + ' criteria), en301549-3.2.1.yaml (' + clauses.length + ' clauses)');
