import { pdfString, pdfTextString, textWidth, wrapText } from './pdf-font.js';

/**
 * Minimal tagged-PDF writer (FR-ART-4) — vendored, no browser, no
 * dependency, deterministic.
 *
 * The output is a **tagged** PDF: it carries a structure tree, marked
 * content, a document language and DisplayDocTitle. An accessibility
 * compliance tool that emitted an untagged PDF would be failing its own
 * subject matter, and untagged PDFs are precisely what EN 301 549
 * clause 10 exists to prevent.
 *
 * This is not a general-purpose PDF library. It lays out the block model
 * in `doc-model.ts` and nothing else.
 */

import type { DocBlock } from './doc-model.js';

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 56.7; // 20mm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

interface Style {
  size: number;
  bold: boolean;
  spaceBefore: number;
  spaceAfter: number;
  /** PDF structure type for the tag. */
  tag: string;
  indent?: number;
  gray?: number;
}

const STYLES: Record<string, Style> = {
  title: { size: 20, bold: true, spaceBefore: 0, spaceAfter: 14, tag: 'H1' },
  h1: { size: 16, bold: true, spaceBefore: 18, spaceAfter: 8, tag: 'H1' },
  h2: { size: 13, bold: true, spaceBefore: 14, spaceAfter: 6, tag: 'H2' },
  h3: { size: 11.5, bold: true, spaceBefore: 10, spaceAfter: 4, tag: 'H3' },
  p: { size: 10.5, bold: false, spaceBefore: 0, spaceAfter: 7, tag: 'P' },
  bullet: { size: 10.5, bold: false, spaceBefore: 0, spaceAfter: 4, tag: 'LBody', indent: 16 },
  note: { size: 10.5, bold: true, spaceBefore: 0, spaceAfter: 12, tag: 'P' },
  meta: { size: 9, bold: false, spaceBefore: 0, spaceAfter: 8, tag: 'P', gray: 0.35 },
};

const LEADING = 1.35;

interface DrawnLine {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
  gray?: number;
}

/** One marked-content run: a structure element bound to a page. */
interface Mark {
  tag: string;
  page: number;
  mcid: number;
  /** Nesting parent within the structure tree, as an index into `marks`. */
  parent?: number;
  children: number[];
  isContainer: boolean;
}

interface PageContent {
  lines: DrawnLine[];
  /** Content-stream operations in order, so BDC/EMC wrap the right text. */
  ops: string[];
}

export interface PdfMeta {
  title: string;
  lang: string;
  author: string;
  /** ISO date; never the wall clock (FR-ART-5). */
  date: string;
  subject?: string;
}

class Layout {
  pages: PageContent[] = [{ lines: [], ops: [] }];
  marks: Mark[] = [];
  private y = PAGE_HEIGHT - MARGIN;
  private pageIndex = 0;
  private mcidCounters: number[] = [0];

  private newPage(): void {
    this.pages.push({ lines: [], ops: [] });
    this.mcidCounters.push(0);
    this.pageIndex++;
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensureSpace(needed: number): void {
    if (this.y - needed < MARGIN) this.newPage();
  }

  /** Emit one text block as a tagged marked-content run. */
  text(styleName: keyof typeof STYLES | string, content: string, parent?: number): number {
    const style = STYLES[styleName] ?? STYLES['p']!;
    const indent = style.indent ?? 0;
    const lines = wrapText(content, style.size, CONTENT_WIDTH - indent, style.bold);
    const lineHeight = style.size * LEADING;

    this.y -= style.spaceBefore;
    this.ensureSpace(lineHeight);

    const page = this.pageIndex;
    const mcid = this.mcidCounters[this.pageIndex]!++;
    const markIndex = this.marks.length;
    this.marks.push({ tag: style.tag, page, mcid, parent, children: [], isContainer: false });
    if (parent !== undefined) this.marks[parent]!.children.push(markIndex);

    const ops: string[] = [`/${style.tag} <</MCID ${mcid}>> BDC`];
    for (const line of lines) {
      // A block that runs past the page break continues on the next page;
      // the structure element stays whole, which is what a reader needs.
      if (this.y - lineHeight < MARGIN) {
        ops.push('EMC');
        this.pages[this.pageIndex]!.ops.push(...ops);
        ops.length = 0;
        this.newPage();
        const contMcid = this.mcidCounters[this.pageIndex]!++;
        ops.push(`/${style.tag} <</MCID ${contMcid}>> BDC`);
      }
      this.y -= lineHeight;
      ops.push(
        textOp(line, MARGIN + indent, this.y, style.size, style.bold, style.gray)
      );
    }
    ops.push('EMC');
    this.pages[this.pageIndex]!.ops.push(...ops);
    this.y -= style.spaceAfter;
    return markIndex;
  }

  /** Emit a tagged table: Table > TR > TH/TD. */
  table(headers: string[], rows: string[][], parent?: number): number {
    const columns = Math.max(headers.length, 1);
    const size = 9;
    const padding = 4;
    const colWidth = CONTENT_WIDTH / columns;
    const lineHeight = size * 1.3;

    const tableIndex = this.marks.length;
    this.marks.push({
      tag: 'Table',
      page: this.pageIndex,
      mcid: -1,
      parent,
      children: [],
      isContainer: true,
    });
    if (parent !== undefined) this.marks[parent]!.children.push(tableIndex);

    const emitRow = (cells: string[], header: boolean) => {
      const wrapped = cells.map((c) =>
        wrapText(c, size, colWidth - 2 * padding, header)
      );
      const height = Math.max(...wrapped.map((w) => w.length)) * lineHeight + 2 * padding;
      if (this.y - height < MARGIN) this.newPage();

      const rowIndex = this.marks.length;
      this.marks.push({
        tag: 'TR',
        page: this.pageIndex,
        mcid: -1,
        parent: tableIndex,
        children: [],
        isContainer: true,
      });
      this.marks[tableIndex]!.children.push(rowIndex);

      const top = this.y;
      const bottom = top - height;
      const page = this.pages[this.pageIndex]!;

      if (header) {
        page.ops.push(
          `0.94 0.94 0.94 rg ${MARGIN.toFixed(2)} ${bottom.toFixed(2)} ${CONTENT_WIDTH.toFixed(2)} ${height.toFixed(2)} re f 0 g`
        );
      }

      wrapped.forEach((cellLines, column) => {
        const mcid = this.mcidCounters[this.pageIndex]!++;
        const cellIndex = this.marks.length;
        this.marks.push({
          tag: header ? 'TH' : 'TD',
          page: this.pageIndex,
          mcid,
          parent: rowIndex,
          children: [],
          isContainer: false,
        });
        this.marks[rowIndex]!.children.push(cellIndex);

        const ops = [`/${header ? 'TH' : 'TD'} <</MCID ${mcid}>> BDC`];
        let lineY = top - padding - size;
        for (const line of cellLines) {
          ops.push(
            textOp(line, MARGIN + column * colWidth + padding, lineY, size, header)
          );
          lineY -= lineHeight;
        }
        ops.push('EMC');
        page.ops.push(...ops);
      });

      // Cell borders, drawn after the text so they are never overprinted.
      page.ops.push('0.46 0.46 0.46 RG 0.5 w');
      for (let c = 0; c <= columns; c++) {
        const x = MARGIN + c * colWidth;
        page.ops.push(`${x.toFixed(2)} ${top.toFixed(2)} m ${x.toFixed(2)} ${bottom.toFixed(2)} l S`);
      }
      for (const y of [top, bottom]) {
        page.ops.push(
          `${MARGIN.toFixed(2)} ${y.toFixed(2)} m ${(MARGIN + CONTENT_WIDTH).toFixed(2)} ${y.toFixed(2)} l S`
        );
      }
      this.y = bottom;
    };

    emitRow(headers, true);
    for (const row of rows) emitRow(row, false);
    this.y -= 10;
    return tableIndex;
  }
}

function textOp(
  text: string,
  x: number,
  y: number,
  size: number,
  bold: boolean,
  gray?: number
): string {
  const font = bold ? '/F2' : '/F1';
  const color = gray !== undefined ? `${gray} ${gray} ${gray} rg ` : '0 g ';
  return `BT ${color}${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfString(text)}) Tj ET`;
}

/** Render a block document to a tagged PDF. */
export function buildPdf(blocks: DocBlock[], meta: PdfMeta): Uint8Array {
  const layout = new Layout();

  // Everything hangs off one Document element, which is what makes the
  // structure tree a tree rather than a pile.
  const documentIndex = layout.marks.length;
  layout.marks.push({
    tag: 'Document',
    page: 0,
    mcid: -1,
    children: [],
    isContainer: true,
  });

  for (const block of blocks) {
    if (block.type === 'table') {
      layout.table(block.headers, block.rows, documentIndex);
    } else {
      const text = block.type === 'bullet' ? `•  ${block.text}` : block.text;
      layout.text(block.type, text, documentIndex);
    }
  }

  return serialize(layout, meta);
}

function serialize(layout: Layout, meta: PdfMeta): Uint8Array {
  const objects: string[] = [];
  const add = (body: string): number => {
    objects.push(body);
    return objects.length; // object numbers are 1-based
  };

  const pageCount = layout.pages.length;

  // Reserve numbers so cross-references can be written before contents.
  const catalogId = add('');
  const pagesId = add('');
  const font1Id = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const font2Id = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const structRootId = add('');
  const parentTreeId = add('');
  const infoId = add('');

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageIds.push(add(''));
    contentIds.push(add(''));
  }

  // Structure elements, in tree order.
  const markIds = layout.marks.map(() => add(''));

  layout.marks.forEach((mark, i) => {
    const kids = mark.isContainer
      ? mark.children.map((c) => `${markIds[c]} 0 R`).join(' ')
      : `<< /Type /MCR /Pg ${pageIds[mark.page]} 0 R /MCID ${mark.mcid} >>`;
    const parent =
      mark.parent !== undefined ? `${markIds[mark.parent]} 0 R` : `${structRootId} 0 R`;
    const pageRef = mark.isContainer ? '' : ` /Pg ${pageIds[mark.page]} 0 R`;
    objects[markIds[i]! - 1] =
      `<< /Type /StructElem /S /${mark.tag} /P ${parent}${pageRef} /K [ ${kids} ] >>`;
  });

  // ParentTree: maps each page's StructParents index to the structure
  // elements that own its marked content, in MCID order.
  const parentTreeNums: string[] = [];
  for (let page = 0; page < pageCount; page++) {
    const owners = layout.marks
      .map((mark, i) => ({ mark, i }))
      .filter(({ mark }) => !mark.isContainer && mark.page === page)
      .sort((a, b) => a.mark.mcid - b.mark.mcid)
      .map(({ i }) => `${markIds[i]} 0 R`);
    parentTreeNums.push(`${page} [ ${owners.join(' ')} ]`);
  }
  objects[parentTreeId - 1] = `<< /Nums [ ${parentTreeNums.join(' ')} ] >>`;

  const topLevel = layout.marks
    .map((mark, i) => ({ mark, i }))
    .filter(({ mark }) => mark.parent === undefined)
    .map(({ i }) => `${markIds[i]} 0 R`)
    .join(' ');
  objects[structRootId - 1] =
    `<< /Type /StructTreeRoot /K [ ${topLevel} ] /ParentTree ${parentTreeId} 0 R /ParentTreeNextKey ${pageCount} >>`;

  for (let i = 0; i < pageCount; i++) {
    const stream = layout.pages[i]!.ops.join('\n');
    objects[contentIds[i]! - 1] =
      `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`;
    objects[pageIds[i]! - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> ` +
      `/Contents ${contentIds[i]} 0 R /StructParents ${i} /Tabs /S >>`;
  }

  objects[pagesId - 1] =
    `<< /Type /Pages /Count ${pageCount} /Kids [ ${pageIds.map((id) => `${id} 0 R`).join(' ')} ] >>`;

  // /Lang and /DisplayDocTitle are the two catalog entries that decide
  // whether assistive technology reads the document correctly at all.
  objects[catalogId - 1] =
    `<< /Type /Catalog /Pages ${pagesId} 0 R /Lang (${pdfString(meta.lang)}) ` +
    `/StructTreeRoot ${structRootId} 0 R /MarkInfo << /Marked true >> ` +
    `/ViewerPreferences << /DisplayDocTitle true >> >>`;

  const stamp = `D:${meta.date.replace(/-/g, '')}000000Z`;
  objects[infoId - 1] =
    `<< /Title <${pdfTextString(meta.title)}> /Author <${pdfTextString(meta.author)}> ` +
    (meta.subject ? `/Subject <${pdfTextString(meta.subject)}> ` : '') +
    `/Creator (eaa-kit) /Producer (eaa-kit) /CreationDate (${stamp}) /ModDate (${stamp}) >>`;

  // Assemble with a cross-reference table.
  let pdf = '%PDF-1.7\n%âãÏÓ\n';
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return latin1Bytes(pdf);
}

function byteLength(text: string): number {
  // The document is written in Latin-1, so one character is one byte.
  return text.length;
}

function latin1Bytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export { textWidth, wrapText };
