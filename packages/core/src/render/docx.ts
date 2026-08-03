import { createZip } from '../util/zip.js';
import { escapeHtml } from './template.js';

/**
 * WordprocessingML (.docx) writer (FR-ART-4) — legal teams live in Word.
 *
 * The caller supplies the document *body* as WordprocessingML; this module
 * wraps it in the OOXML container with a stylesheet and metadata. That
 * split is deliberate: it lets a jurisdiction pack own its Word layout the
 * same way it owns the HTML, as a logic-less text template
 * (`templates/statement.docx.xml.mustache`), which is what the Gold
 * quality level asks for. Templates stay data — nothing here executes
 * anything a pack supplies.
 *
 * Output is deterministic (FR-ART-5): fixed ZIP timestamps, fixed metadata,
 * fixed part order.
 */

/** Escape text for inclusion in WordprocessingML. */
export function escapeXml(text: string): string {
  // The HTML escaper emits &amp; &lt; &gt; &quot; &#39;, all of which are
  // valid XML, so pack templates escape correctly for both targets.
  return escapeHtml(text);
}

export interface DocxMeta {
  title: string;
  /** BCP 47 language tag; sets the proofing language and document language. */
  lang: string;
  creator: string;
  /** ISO date used for created/modified — never the wall clock. */
  date: string;
  description?: string;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

/**
 * Styles. Real heading styles matter for accessibility: they are what
 * gives a Word document a navigable structure for screen-reader users.
 * A compliance document with fake headings made of bold text would be
 * embarrassing.
 */
function styles(lang: string): string {
  const heading = (id: string, name: string, level: number, size: number) => `
<w:style w:type="paragraph" w:styleId="${id}">
<w:name w:val="${name}"/>
<w:basedOn w:val="Normal"/>
<w:next w:val="Normal"/>
<w:uiPriority w:val="${level + 8}"/>
<w:qFormat/>
<w:pPr><w:outlineLvl w:val="${level - 1}"/><w:spacing w:before="${level === 1 ? 240 : 200}" w:after="120"/><w:keepNext/></w:pPr>
<w:rPr><w:b/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>
</w:style>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
<w:sz w:val="22"/><w:szCs w:val="22"/>
<w:lang w:val="${escapeXml(lang)}"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${heading('Title', 'Title', 1, 40)}
${heading('Heading1', 'heading 1', 1, 32)}
${heading('Heading2', 'heading 2', 2, 28)}
${heading('Heading3', 'heading 3', 3, 24)}
<w:style w:type="paragraph" w:styleId="ListParagraph">
<w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr>
</w:style>
<w:style w:type="paragraph" w:styleId="DraftNotice">
<w:name w:val="Draft Notice"/><w:basedOn w:val="Normal"/>
<w:pPr>
<w:pBdr>
<w:top w:val="dashed" w:sz="18" w:space="4" w:color="8A6D00"/>
<w:left w:val="dashed" w:sz="18" w:space="4" w:color="8A6D00"/>
<w:bottom w:val="dashed" w:sz="18" w:space="4" w:color="8A6D00"/>
<w:right w:val="dashed" w:sz="18" w:space="4" w:color="8A6D00"/>
</w:pBdr>
<w:shd w:val="clear" w:fill="FFF8E1"/>
<w:spacing w:after="240"/>
</w:pPr>
<w:rPr><w:b/><w:color w:val="5C4A00"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="ReviewNotice">
<w:name w:val="Review Notice"/><w:basedOn w:val="Normal"/>
<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="1A6B2F"/></w:pBdr><w:shd w:val="clear" w:fill="F0F7F1"/><w:spacing w:after="240"/></w:pPr>
<w:rPr><w:color w:val="143D1F"/></w:rPr>
</w:style>
<w:style w:type="table" w:styleId="ArtifactTable">
<w:name w:val="Artifact Table"/>
<w:tblPr>
<w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="767676"/>
<w:left w:val="single" w:sz="4" w:color="767676"/>
<w:bottom w:val="single" w:sz="4" w:color="767676"/>
<w:right w:val="single" w:sz="4" w:color="767676"/>
<w:insideH w:val="single" w:sz="4" w:color="767676"/>
<w:insideV w:val="single" w:sz="4" w:color="767676"/>
</w:tblBorders>
<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>
</w:tblPr>
</w:style>
</w:styles>`;
}

function settings(lang: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:zoom w:percent="100"/>
<w:defaultTabStop w:val="720"/>
<w:themeFontLang w:val="${escapeXml(lang)}"/>
</w:settings>`;
}

function coreProps(meta: DocxMeta): string {
  const stamp = `${meta.date}T00:00:00Z`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escapeXml(meta.title)}</dc:title>
<dc:creator>${escapeXml(meta.creator)}</dc:creator>
<cp:lastModifiedBy>${escapeXml(meta.creator)}</cp:lastModifiedBy>
<dc:language>${escapeXml(meta.lang)}</dc:language>
${meta.description ? `<dc:description>${escapeXml(meta.description)}</dc:description>` : ''}
<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified>
</cp:coreProperties>`;
}

const APP_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
<Application>eaa-kit</Application>
</Properties>`;

/** Wrap a WordprocessingML body in a complete .docx package. */
export function buildDocx(bodyXml: string, meta: DocxMeta): Uint8Array {
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${bodyXml}
<w:sectPr>
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

  // Part order is fixed so the archive bytes are stable.
  return createZip([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: ROOT_RELS },
    { name: 'word/_rels/document.xml.rels', data: DOCUMENT_RELS },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles(meta.lang) },
    { name: 'word/settings.xml', data: settings(meta.lang) },
    { name: 'docProps/core.xml', data: coreProps(meta) },
    { name: 'docProps/app.xml', data: APP_PROPS },
  ]);
}

/* ------------------------------------------------------------------ *
 * Helpers for building bodies in code (used by the ACR, burden and
 * trace renderers, which are jurisdiction-independent).
 * ------------------------------------------------------------------ */

export function docxParagraph(text: string, style?: string): string {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function docxHeading(text: string, level: 1 | 2 | 3): string {
  return docxParagraph(text, `Heading${level}`);
}

export function docxTitle(text: string): string {
  return docxParagraph(text, 'Title');
}

export function docxBullet(text: string): string {
  return docxParagraph(`• ${text}`, 'ListParagraph');
}

/**
 * A table with a real header row. `tblHeader` marks the first row as a
 * repeating header, which is what assistive technology uses to associate
 * data cells with their headers.
 */
export function docxTable(headers: string[], rows: string[][]): string {
  const width = Math.floor(9000 / Math.max(headers.length, 1));
  const cell = (text: string, header: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${
      header ? '<w:shd w:val="clear" w:fill="F0F0F0"/>' : ''
    }</w:tcPr><w:p><w:r>${header ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;

  const headerRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${headers.map((h) => cell(h, true)).join('')}</w:tr>`;
  const bodyRows = rows
    .map((row) => `<w:tr>${row.map((c) => cell(c, false)).join('')}</w:tr>`)
    .join('');

  return `<w:tbl>
<w:tblPr><w:tblStyle w:val="ArtifactTable"/><w:tblW w:w="0" w:type="auto"/>
<w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="767676"/>
<w:left w:val="single" w:sz="4" w:color="767676"/>
<w:bottom w:val="single" w:sz="4" w:color="767676"/>
<w:right w:val="single" w:sz="4" w:color="767676"/>
<w:insideH w:val="single" w:sz="4" w:color="767676"/>
<w:insideV w:val="single" w:sz="4" w:color="767676"/>
</w:tblBorders>
</w:tblPr>
<w:tblGrid>${headers.map(() => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>
${headerRow}${bodyRows}
</w:tbl><w:p/>`;
}
