import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import {
  computeConformance,
  createZip,
  crc32,
  loadEvidence,
  loadPack,
  parseConfig,
  renderArtifact,
  buildPdf,
  type ArtifactKind,
  type EaaConfig,
} from '../src/index.js';
import { textWidth, wrapText, pdfString, pdfTextString } from '../src/render/pdf-font.js';

/**
 * DOCX and PDF (FR-ART-4). The formats are binary, so these tests parse
 * the output rather than trusting it: the ZIP central directory is walked,
 * the XML is parsed, and the PDF cross-reference table is followed.
 */

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PACKS = join(import.meta.dirname, '..', '..', 'packs', 'packs');

function setup(code = 'de') {
  const configPath = join(PACKS, code, 'fixture', 'config.yaml');
  const config = parseConfig(readFileSync(configPath, 'utf8'), configPath) as EaaConfig;
  const pack = loadPack(join(PACKS, code), { fallbackTemplatesDir: join(PACKS, 'eu') });
  const evidence = loadEvidence([join(FIXTURES, 'axe-basic.json')], {
    manualPath: join(FIXTURES, 'manual.yaml'),
  });
  return { config, pack, conformance: computeConformance(evidence) };
}

/* --------------------------- ZIP writer --------------------------- */

/** Minimal ZIP reader, so the tests verify the archive independently. */
function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Locate the end-of-central-directory record.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.notEqual(eocd, -1, 'no end-of-central-directory record');
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const entries = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(offset, true), 0x02014b50, 'bad central directory signature');
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    // Follow the local header to the data.
    assert.equal(view.getUint32(localOffset, true), 0x04034b50, 'bad local header signature');
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? raw : new Uint8Array(inflateRawSync(raw));
    assert.equal(crc32(data), crc, `${name}: CRC mismatch`);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

test('the ZIP writer round-trips and fixes timestamps (FR-ART-5)', () => {
  const zip = createZip([
    { name: 'a.txt', data: 'hello hello hello hello hello hello hello' },
    { name: 'dir/b.bin', data: new Uint8Array([1, 2, 3]), store: true },
  ]);
  const entries = readZip(zip);
  assert.deepEqual([...entries.keys()], ['a.txt', 'dir/b.bin']);
  assert.equal(new TextDecoder().decode(entries.get('a.txt')!), 'hello '.repeat(6) + 'hello');
  assert.deepEqual([...entries.get('dir/b.bin')!], [1, 2, 3]);

  // Every entry carries the fixed DOS date 1980-01-01, so archives of the
  // same content are byte-identical no matter when they were built.
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(view.getUint16(10, true), 0, 'DOS time must be fixed');
  assert.equal(view.getUint16(12, true), (1 << 5) | 1, 'DOS date must be fixed');

  assert.deepEqual(createZip([{ name: 'a.txt', data: 'x' }]), createZip([{ name: 'a.txt', data: 'x' }]));
});

test('crc32 matches known values', () => {
  assert.equal(crc32(new TextEncoder().encode('')), 0);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

/* ----------------------------- DOCX ------------------------------- */

test('DOCX is a valid OOXML package with the required parts', () => {
  const { conformance, config, pack } = setup();
  const artifact = renderArtifact(conformance, config, pack, {
    kind: 'statement',
    format: 'docx',
    lang: 'de',
  });
  assert.equal(artifact.isBinary, true);
  assert.ok(artifact.bytes, 'binary artifacts must expose bytes');
  assert.equal(artifact.filenameHint, 'statement.de.de.docx');

  const entries = readZip(artifact.bytes!);
  for (const part of [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
    'word/styles.xml',
    'word/settings.xml',
    'docProps/core.xml',
  ]) {
    assert.ok(entries.has(part), `missing part ${part}`);
  }

  const document = new TextDecoder().decode(entries.get('word/document.xml')!);
  assert.match(document, /^<\?xml version="1\.0"/);
  assert.match(document, /<w:body>/);
  // Real heading styles, not bold paragraphs: this is what gives a Word
  // document a navigable structure for screen-reader users.
  assert.match(document, /w:pStyle w:val="Title"/);
  assert.match(document, /w:pStyle w:val="Heading1"/);
  assert.match(document, /Erklärung zur Barrierefreiheit/);
  assert.match(document, /ENTWURF/);

  // Language metadata must reach both the style defaults and core props.
  assert.match(new TextDecoder().decode(entries.get('word/styles.xml')!), /w:lang w:val="de"/);
  const core = new TextDecoder().decode(entries.get('docProps/core.xml')!);
  assert.match(core, /<dc:language>de<\/dc:language>/);
  // Dates come from config, never the clock.
  assert.match(core, /2026-07-01T00:00:00Z/);
  assert.doesNotMatch(core, new RegExp(new Date().getFullYear() === 2026 ? '(?!)' : String(new Date().getFullYear())));
});

test('DOCX XML is well-formed for every pack and language', () => {
  // A malformed part makes Word refuse the file outright, so this checks
  // structure rather than content: balanced tags, escaped entities.
  for (const code of ['eu', 'de', 'fr', 'es', 'it', 'ie']) {
    const { conformance, config, pack } = setup(code);
    for (const lang of pack.meta.languages) {
      for (const kind of ['statement', 'burden', 'acr', 'trace'] as ArtifactKind[]) {
        const artifact = renderArtifact(conformance, config, pack, { kind, format: 'docx', lang });
        const entries = readZip(artifact.bytes!);
        const xml = new TextDecoder().decode(entries.get('word/document.xml')!);
        assertWellFormed(xml, `${code}/${lang}/${kind}`);
        // Bare ampersands are the classic way to break an OOXML part.
        assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|#\d+;)/, `${code}/${lang}/${kind}: unescaped &`);
      }
    }
  }
});

test('DOCX tables carry a real header row', () => {
  const { conformance, config, pack } = setup();
  const artifact = renderArtifact(conformance, config, pack, {
    kind: 'acr',
    format: 'docx',
    lang: 'en',
  });
  const xml = new TextDecoder().decode(readZip(artifact.bytes!).get('word/document.xml')!);
  assert.match(xml, /<w:tbl>/);
  // tblHeader marks the row as a repeating header — the association
  // assistive technology relies on.
  assert.match(xml, /<w:tblHeader\/>/);
});

test('a pack may own its Word layout with a logic-less template', () => {
  const { conformance, config, pack } = setup();
  const custom = {
    ...pack,
    templates: {
      ...pack.templates,
      'statement.docx.xml':
        '<w:p><w:r><w:t>PACK TEMPLATE {{product.name}} — {{t.statement.title}}</w:t></w:r></w:p>',
    },
  };
  const artifact = renderArtifact(conformance, config, custom, {
    kind: 'statement',
    format: 'docx',
    lang: 'de',
  });
  const xml = new TextDecoder().decode(readZip(artifact.bytes!).get('word/document.xml')!);
  assert.match(xml, /PACK TEMPLATE/);
  assert.match(xml, /Erklärung zur Barrierefreiheit/);
  assertWellFormed(xml, 'pack docx template');
});

/* ------------------------------ PDF ------------------------------- */

function pdfText(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

test('PDF is structurally valid and tagged (FR-ART-4, FR-ART-6)', () => {
  const { conformance, config, pack } = setup();
  const artifact = renderArtifact(conformance, config, pack, {
    kind: 'statement',
    format: 'pdf',
    lang: 'de',
  });
  const pdf = pdfText(artifact.bytes!);

  assert.match(pdf, /^%PDF-1\.7/);
  assert.match(pdf, /%%EOF\n$/);

  // The cross-reference offset must actually point at the xref table, or
  // readers reject the file.
  const startxref = Number(/startxref\s+(\d+)/.exec(pdf)![1]);
  assert.equal(pdf.slice(startxref, startxref + 4), 'xref');

  // Every offset in the table must land on its object header.
  const xrefSection = pdf.slice(startxref);
  const offsets = [...xrefSection.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  assert.ok(offsets.length > 0);
  offsets.forEach((offset, i) => {
    assert.match(pdf.slice(offset, offset + 20), new RegExp(`^${i + 1} 0 obj`), `object ${i + 1} offset wrong`);
  });

  // Tagging: without these an assistive technology cannot read the document
  // in a meaningful order.
  assert.match(pdf, /\/MarkInfo << \/Marked true >>/);
  assert.match(pdf, /\/StructTreeRoot/);
  assert.match(pdf, /\/ParentTree/);
  assert.match(pdf, /\/DisplayDocTitle true/);
  assert.match(pdf, /\/Type \/StructElem/);
  assert.match(pdf, /\/S \/Document/);
  assert.match(pdf, /\/S \/H1/);
  assert.match(pdf, /\/MCID \d+/);
  // Each page declares its ParentTree key.
  assert.match(pdf, /\/StructParents 0/);

  // Title metadata is UTF-16BE, so an em dash is not mangled into "Š" by
  // PDFDocEncoding. BCP 47 language tags are ASCII by definition, so /Lang
  // stays a literal string.
  assert.match(pdf, /\/Title <FEFF[0-9A-F]+>/);
  assert.match(pdf, /\/Author <FEFF[0-9A-F]+>/);
  assert.match(pdf, /\/Lang \(de\)/);
  // The em dash in the title must survive as U+2014 in the UTF-16 stream.
  assert.match(/\/Title <([0-9A-F]+)>/.exec(pdf)![1]!, /2014/);
  // No wall clock.
  assert.match(pdf, /\/CreationDate \(D:20260701000000Z\)/);
});

test('PDF tables are tagged as tables', () => {
  const { conformance, config, pack } = setup();
  const pdf = pdfText(
    renderArtifact(conformance, config, pack, { kind: 'acr', format: 'pdf', lang: 'en' }).bytes!
  );
  for (const tag of ['/S /Table', '/S /TR', '/S /TH', '/S /TD']) {
    assert.ok(pdf.includes(tag), `missing ${tag}`);
  }
});

test('PDF renders every pack and language without throwing', () => {
  for (const code of ['eu', 'de', 'fr', 'es', 'it', 'ie']) {
    const { conformance, config, pack } = setup(code);
    for (const lang of pack.meta.languages) {
      for (const kind of ['statement', 'burden', 'acr', 'trace'] as ArtifactKind[]) {
        const artifact = renderArtifact(conformance, config, pack, { kind, format: 'pdf', lang });
        assert.ok(artifact.bytes!.length > 1000, `${code}/${lang}/${kind}: suspiciously small`);
        assert.match(pdfText(artifact.bytes!), /^%PDF-1\.7/);
      }
    }
  }
});

test('binary output is byte-identical across runs (FR-ART-5)', () => {
  const { conformance, config, pack } = setup();
  for (const format of ['docx', 'pdf'] as const) {
    for (const kind of ['statement', 'burden', 'acr', 'trace'] as ArtifactKind[]) {
      const a = renderArtifact(conformance, config, pack, { kind, format, lang: 'de' });
      const b = renderArtifact(conformance, config, pack, { kind, format, lang: 'de' });
      assert.deepEqual(a.bytes, b.bytes, `${kind}.${format} is not deterministic`);
    }
  }
});

test('the draft watermark survives into the binary formats (FR-ART-7)', () => {
  const { conformance, config, pack } = setup();
  for (const format of ['docx', 'pdf'] as const) {
    const draft = renderArtifact(conformance, config, pack, {
      kind: 'statement',
      format,
      lang: 'de',
    });
    const reviewed = renderArtifact(conformance, config, pack, {
      kind: 'statement',
      format,
      lang: 'de',
      reviewedBy: 'Jane Doe',
      reviewedOn: '2026-08-01',
    });

    const extract = (bytes: Uint8Array) =>
      format === 'docx'
        ? new TextDecoder().decode(readZip(bytes).get('word/document.xml')!)
        : pdfText(bytes);

    assert.match(extract(draft.bytes!), /ENTWURF/, `${format}: draft watermark missing`);
    assert.doesNotMatch(extract(reviewed.bytes!), /ENTWURF/, `${format}: watermark should clear`);
    assert.ok(extract(reviewed.bytes!).includes('Jane Doe') || format === 'pdf');
  }
});

/* -------------------------- font metrics -------------------------- */

test('font metrics and wrapping behave', () => {
  assert.ok(textWidth('W', 10, false) > textWidth('i', 10, false));
  // Accented letters carry the base letter's advance in Helvetica.
  assert.equal(textWidth('é', 10), textWidth('e', 10));
  assert.equal(textWidth('ü', 10), textWidth('u', 10));
  assert.ok(textWidth('Hello', 10, true) > textWidth('Hello', 10, false));

  const lines = wrapText('one two three four five six seven eight', 10, 60);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(textWidth(line, 10) <= 60 || !line.includes(' '));

  // A single word longer than the line must still be emitted, not dropped.
  assert.deepEqual(wrapText('Barrierefreiheitsstärkungsgesetz', 10, 5), [
    'Barrierefreiheitsstärkungsgesetz',
  ]);
});

test('PDF string escaping protects the syntax', () => {
  assert.equal(pdfString('a(b)c\\d'), 'a\\(b\\)c\\\\d');
  // WinAnsi puts the em dash at 0x97, not at its Unicode value.
  assert.equal(pdfString('—'), '\\227');
  assert.equal(pdfString('ü'), '\\374');
  // Outside WinAnsi: visible replacement rather than a corrupt byte stream.
  assert.equal(pdfString('日'), '?');

  assert.equal(pdfTextString('A'), 'FEFF0041');
  assert.equal(pdfTextString('—'), 'FEFF2014');
});

/* ------------------------------ helpers ---------------------------- */

/** Assert XML tags balance — enough to catch what breaks an OOXML part. */
function assertWellFormed(xml: string, label: string): void {
  const stack: string[] = [];
  for (const m of xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (m[0].startsWith('<?')) continue;
    if (closing === '/') {
      assert.equal(stack.pop(), name, `${label}: unbalanced </${name}>`);
    } else if (selfClosing !== '/') {
      stack.push(name!);
    }
  }
  assert.deepEqual(stack, [], `${label}: unclosed tags`);
}
