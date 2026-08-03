import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

/**
 * CLI integration tests: the CLI is exercised as a subprocess so exit
 * codes, stdout/stderr routing and the "no stack traces at users" rule
 * (NFR-8) are all covered.
 */

const CLI = join(import.meta.dirname, '..', 'src', 'main.ts');
const PACKS = join(import.meta.dirname, '..', '..', 'packs', 'packs');
const AXE_FIXTURE = join(PACKS, 'eu', 'fixture', 'axe.json');
// Absolute, because every run happens in a throwaway project directory
// where a bare "tsx" specifier would not resolve.
const TSX = createRequire(import.meta.url).resolve('tsx');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function run(args: string[], cwd: string): RunResult {
  const result = spawnSync(process.execPath, ['--import', TSX, CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, A11Y_STATEMENT_PACKS_DIR: PACKS },
  });
  return {
    code: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), 'accessibility-statement-cli-'));
  cpSync(AXE_FIXTURE, join(dir, 'axe.json'));
  const init = run(['init', '--yes', '--date', '2026-07-01'], dir);
  assert.equal(init.code, 0, init.stderr);
  return dir;
}

test('init writes a valid config and a manual checklist without prompting (FR-CLI-1)', () => {
  const dir = project();
  assert.ok(existsSync(join(dir, 'a11y-statement.config.yaml')));
  assert.ok(existsSync(join(dir, 'manual.yaml')));

  const config = readFileSync(join(dir, 'a11y-statement.config.yaml'), 'utf8');
  // The evidence file present in the directory is detected.
  assert.match(config, /axe\.json/);
  // The config is documentation as well as data.
  assert.match(config, /# accessibility-statement configuration/);
  assert.match(config, /accesses the network/);

  // Re-running without --force refuses rather than clobbering.
  const again = run(['init', '--yes'], dir);
  assert.equal(again.code, 2);
  assert.match(again.stderr, /already exists/);
  assert.match(again.stderr, /--force/);

  rmSync(dir, { recursive: true, force: true });
});

test('render statement produces a watermarked statement in the pack language (FR-CLI-2)', () => {
  const dir = project();
  const result = run(['render', 'statement', '--jurisdiction', 'de', '--lang', 'de'], dir);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /<html lang="de">/);
  assert.match(result.stdout, /Erklärung zur Barrierefreiheit/);
  assert.match(result.stdout, /ENTWURF/);
  // Traceable content: the failing criteria appear with their EN clauses.
  assert.match(result.stdout, /9\.1\.1\.1/);
  rmSync(dir, { recursive: true, force: true });
});

test('--reviewed-by and --reviewed-on together remove the watermark (FR-ART-7)', () => {
  const dir = project();
  const draft = run(['render', 'statement', '--jurisdiction', 'eu'], dir);
  assert.match(draft.stdout, /DRAFT/);

  const reviewed = run(
    ['render', 'statement', '--jurisdiction', 'eu', '--reviewed-by', 'Jane Doe', '--reviewed-on', '2026-08-01'],
    dir
  );
  assert.doesNotMatch(reviewed.stdout, /DRAFT/);
  assert.match(reviewed.stdout, /Jane Doe/);
  rmSync(dir, { recursive: true, force: true });
});

test('render acr --format openacr emits parseable OpenACR (FR-CLI-2, FR-ART-2)', () => {
  const dir = project();
  const result = run(['render', 'acr', '--format', 'openacr'], dir);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^catalog: en-301-549-3\.2\.1-wcag-2\.1$/m);
  assert.match(result.stdout, /success_criteria_level_a/);
  assert.match(result.stdout, /success_criteria_level_aa/);
  rmSync(dir, { recursive: true, force: true });
});

test('--out writes files and --json reports machine-readable results (FR-CLI-6)', () => {
  const dir = project();
  const out = join(dir, 'artifacts', 'statement.html');
  const result = run(['render', 'statement', '--jurisdiction', 'fr', '--lang', 'fr', '--out', out, '--json'], dir);
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.kind, 'statement');
  assert.equal(payload.lang, 'fr');
  assert.equal(payload.path, out);
  assert.equal(payload.compliance, 'partial');
  assert.ok(existsSync(out));
  // The apostrophe is HTML-escaped, as it must be.
  assert.match(readFileSync(out, 'utf8'), /D\u00e9claration d&#39;accessibilit\u00e9/);
  rmSync(dir, { recursive: true, force: true });
});

test('render-all writes every artifact for the GitHub Action (FR-CI-1)', () => {
  const dir = project();
  const result = run(['render-all', '--jurisdiction', 'ie', '--out-dir', join(dir, 'out'), '--json'], dir);
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.files.length, 10);
  for (const file of payload.files) assert.ok(existsSync(file), `${file} missing`);
  // The Word and PDF renditions legal teams ask for are part of the set.
  assert.ok(payload.files.some((f: string) => f.endsWith('.docx')));
  assert.ok(payload.files.some((f: string) => f.endsWith('.pdf')));
  rmSync(dir, { recursive: true, force: true });
});

test('check creates, passes and fails on regression (FR-CLI-3, acceptance 3)', () => {
  const dir = project();

  // Without a baseline, check refuses rather than inventing one.
  const noBaseline = run(['check'], dir);
  assert.equal(noBaseline.code, 2);
  assert.match(noBaseline.stderr, /No conformance baseline/);
  assert.match(noBaseline.stderr, /check --update/);

  const created = run(['check', '--update'], dir);
  assert.equal(created.code, 0, created.stderr);
  assert.ok(existsSync(join(dir, 'a11y-statement.lock.json')));

  const clean = run(['check'], dir);
  assert.equal(clean.code, 0, clean.stderr);
  assert.match(clean.stdout, /No conformance changes/);

  // Seed a regression: a rule that passed now fails.
  const axe = JSON.parse(readFileSync(join(dir, 'axe.json'), 'utf8'));
  const lang = axe.passes.find((p: { id: string }) => p.id === 'html-has-lang');
  axe.passes = axe.passes.filter((p: { id: string }) => p.id !== 'html-has-lang');
  axe.violations.push({ ...lang, impact: 'serious' });
  writeFileSync(join(dir, 'axe.json'), JSON.stringify(axe, null, 2));

  const regressed = run(['check'], dir);
  assert.equal(regressed.code, 1, 'a regression must fail CI');
  assert.match(regressed.stdout, /Regressions:/);
  assert.match(regressed.stdout, /3\.1\.1: pass → fail/);

  const asJson = run(['check', '--json'], dir);
  assert.equal(asJson.code, 1);
  const payload = JSON.parse(asJson.stdout);
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.regressions, [{ criterion: '3.1.1', from: 'pass', to: 'fail' }]);

  // Accepting the new state deliberately makes it pass again.
  assert.equal(run(['check', '--update'], dir).code, 0);
  assert.equal(run(['check'], dir).code, 0);

  rmSync(dir, { recursive: true, force: true });
});

test('scaffold-pack produces a pack that fails validation only where work remains (REQ-PACK-3)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'accessibility-statement-scaffold-'));
  const target = join(dir, 'pt');
  const scaffold = run(['contrib', 'scaffold-pack', '--country', 'pt', '--out', target], dir);
  assert.equal(scaffold.code, 0, scaffold.stderr);
  assert.match(scaffold.stdout, /Three steps to a Bronze pack/);

  for (const file of ['pack.yaml', 'strings.pt.yaml', 'TODO.md', 'fixture/config.yaml', 'fixture/axe.json']) {
    assert.ok(existsSync(join(target, file)), `${file} missing from the scaffold`);
  }

  // The scaffold is honest: it does not pass until the TODOs are done...
  const invalid = run(['validate-pack', target], dir);
  assert.equal(invalid.code, 1);
  assert.match(invalid.stdout, /scaffold placeholder/);

  // ...and the TODOs are the entire remaining work.
  const filled = readFileSync(join(target, 'pack.yaml'), 'utf8')
    .replace(/^name: TODO$/m, 'name: Portugal')
    .replace(/^  act: TODO$/m, '  act: Decreto-Lei n.º 82/2022')
    .replace(/^    - https:\/\/TODO$/m, '    - https://diariodarepublica.pt/')
    .replace(/^  name: TODO$/m, '  name: Autoridade de Segurança Alimentar e Económica')
    .replace(/^  url: https:\/\/TODO$/m, '  url: https://www.asae.gov.pt/')
    .replace(/^  - TODO$/m, '  - octocat');
  writeFileSync(join(target, 'pack.yaml'), filled);
  writeFileSync(join(target, 'strings.pt.yaml'), 'statement:\n  title: "Declaração de acessibilidade"\n');

  const valid = run(['validate-pack', target], dir);
  assert.equal(valid.code, 0, valid.stdout);
  assert.match(valid.stdout, /1 pack valid/);

  rmSync(dir, { recursive: true, force: true });
});

test('scaffold-reader produces a reader skeleton and its test', () => {
  const dir = mkdtempSync(join(tmpdir(), 'accessibility-statement-reader-'));
  const result = run(['contrib', 'scaffold-reader', '--name', 'wave', '--out', dir], dir);
  assert.equal(result.code, 0, result.stderr);
  const source = readFileSync(join(dir, 'wave.ts'), 'utf8');
  assert.match(source, /export const waveReader: EvidenceReader/);
  assert.match(source, /detect\(parsed: unknown\)/);
  assert.ok(existsSync(join(dir, 'wave.reader.test.ts')));
  rmSync(dir, { recursive: true, force: true });
});

test('validate-pack checks every shipped pack by default (QA-6)', () => {
  const dir = project();
  const result = run(['validate-pack'], dir);
  assert.equal(result.code, 0, result.stdout);
  for (const code of ['eu', 'de', 'fr', 'es', 'it', 'ie']) {
    assert.match(result.stdout, new RegExp(`ok\\s+${code}`));
  }
  rmSync(dir, { recursive: true, force: true });
});

test('packs lists the support matrix, including via --json', () => {
  const dir = project();
  const human = run(['packs'], dir);
  assert.equal(human.code, 0);
  assert.match(human.stdout, /Germany/);
  assert.match(human.stdout, /Missing your country\?/);

  const json = JSON.parse(run(['packs', '--json'], dir).stdout);
  assert.ok(json.packs.length >= 6);
  assert.deepEqual(json.standards.en301549, ['3.2.1']);
  rmSync(dir, { recursive: true, force: true });
});

test('errors are actionable and never show a stack trace (NFR-8)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'accessibility-statement-err-'));

  const noConfig = run(['render', 'statement'], dir);
  assert.equal(noConfig.code, 2);
  assert.match(noConfig.stderr, /Cannot read configuration file/);
  assert.match(noConfig.stderr, /Fix: .*accessibility-statement init/);
  assert.match(noConfig.stderr, /Docs: https/);
  assert.doesNotMatch(noConfig.stderr, /\bat \w+.*:\d+:\d+/, 'no stack frames');

  const unknownCommand = run(['frobnicate'], dir);
  assert.equal(unknownCommand.code, 2);
  assert.match(unknownCommand.stderr, /Unknown command "frobnicate"/);

  const unknownArtifact = run(['render', 'nonsense'], dir);
  assert.equal(unknownArtifact.code, 2);
  assert.match(unknownArtifact.stderr, /statement \| acr \| burden \| trace/);

  const badJurisdiction = run(['render', 'statement', '--jurisdiction', 'zz'], project());
  assert.equal(badJurisdiction.code, 2);
  assert.match(badJurisdiction.stderr, /Available packs/);
  assert.match(badJurisdiction.stderr, /scaffold-pack --country zz/);

  rmSync(dir, { recursive: true, force: true });
});

test('binary formats refuse to write to a terminal and name the fix', () => {
  const dir = project();
  const result = run(['render', 'statement', '--format', 'docx'], dir);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /binary format/);
  assert.match(result.stderr, /--out/);
  rmSync(dir, { recursive: true, force: true });
});

test('DOCX and PDF render to real files (FR-ART-4)', () => {
  const dir = project();

  const docx = run(
    ['render', 'statement', '--jurisdiction', 'de', '--lang', 'de', '--format', 'docx', '--out', join(dir, 'statement.docx')],
    dir
  );
  assert.equal(docx.code, 0, docx.stderr);
  const docxBytes = readFileSync(join(dir, 'statement.docx'));
  // A .docx is a ZIP: check the magic rather than trusting the extension.
  assert.equal(docxBytes.subarray(0, 2).toString('latin1'), 'PK');
  assert.ok(docxBytes.length > 2000);

  const pdf = run(
    ['render', 'burden', '--format', 'pdf', '--out', join(dir, 'burden.pdf')],
    dir
  );
  assert.equal(pdf.code, 0, pdf.stderr);
  const pdfBytes = readFileSync(join(dir, 'burden.pdf'));
  assert.equal(pdfBytes.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(pdfBytes.subarray(-6).toString('latin1').includes('%%EOF'));

  // Deterministic across invocations, like every other format.
  run(['render', 'burden', '--format', 'pdf', '--out', join(dir, 'burden2.pdf')], dir);
  assert.deepEqual(readFileSync(join(dir, 'burden.pdf')), readFileSync(join(dir, 'burden2.pdf')));

  rmSync(dir, { recursive: true, force: true });
});

test('both installed binaries are the same program', () => {
  // The package ships two bins: the searchable name and a short alias.
  // A name-based "am I the entry point?" check silently breaks the alias,
  // which is exactly the bug this guards.
  const pkg = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')
  ) as { bin: Record<string, string> };
  assert.deepEqual(Object.keys(pkg.bin).sort(), ['a11y-statement', 'accessibility-statement']);
  assert.equal(new Set(Object.values(pkg.bin)).size, 1, 'both bins must point at one entry point');

  const dir = mkdtempSync(join(tmpdir(), 'a11y-bin-'));
  const entry = join(import.meta.dirname, '..', pkg.bin['accessibility-statement']!);
  if (existsSync(entry)) {
    // Invoke the built entry point the way npm's .bin shim does.
    const result = spawnSync(process.execPath, [entry, '--version'], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^\d+\.\d+\.\d+$/m, 'the built binary must run and report a version');
  }
  rmSync(dir, { recursive: true, force: true });
});

test('--help and --version work without a project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'accessibility-statement-help-'));
  const help = run(['--help'], dir);
  assert.equal(help.code, 1); // no command given
  assert.match(help.stdout, /generate the artifacts the European Accessibility Act requires/);
  assert.match(help.stdout, /not legal advice/);

  const version = run(['--version'], dir);
  assert.equal(version.code, 0);
  assert.match(version.stdout, /^\d+\.\d+\.\d+$/m);
  rmSync(dir, { recursive: true, force: true });
});

test('two renders of the same project are byte-identical (FR-ART-5, acceptance 5)', () => {
  const dir = project();
  const args = ['render', 'statement', '--jurisdiction', 'it', '--lang', 'it'];
  assert.equal(run(args, dir).stdout, run(args, dir).stdout);

  // Also across a different working directory and absolute config path,
  // which is what "two machines" reduces to for a deterministic tool.
  const other = mkdtempSync(join(tmpdir(), 'accessibility-statement-elsewhere-'));
  const viaAbsolute = run([...args, '--config', join(dir, 'a11y-statement.config.yaml')], other);
  assert.equal(viaAbsolute.code, 0, viaAbsolute.stderr);
  assert.equal(viaAbsolute.stdout, run(args, dir).stdout);

  rmSync(dir, { recursive: true, force: true });
  rmSync(other, { recursive: true, force: true });
});
