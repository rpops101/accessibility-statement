/**
 * Adobe Helvetica / Helvetica-Bold metrics and WinAnsi encoding.
 *
 * Base-14 fonts are the reason eaa-kit can emit PDF with no embedded font
 * file, no browser and no dependency: every conforming PDF reader already
 * has them. Widths are the standard AFM values in 1/1000 em.
 */

const REGULAR: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584,
};

const BOLD: Record<string, number> = {
  ' ': 278, '!': 333, '"': 474, '#': 556, $: 556, '%': 889, '&': 722, "'": 238,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611, '@': 975,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556,
  K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 333, '\\': 278, ']': 333, '^': 584, _: 556, '`': 333,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278,
  k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333,
  u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  '{': 389, '|': 280, '}': 389, '~': 584,
};

for (const table of [REGULAR, BOLD]) {
  for (const digit of '0123456789') table[digit] = 556;
}

/**
 * Accented Latin-1 letters carry the advance width of their base letter in
 * the Adobe standard fonts, so folding to the base letter is exact rather
 * than approximate.
 */
const BASE_LETTER: Record<string, string> = {
  À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A', Ç: 'C',
  È: 'E', É: 'E', Ê: 'E', Ë: 'E', Ì: 'I', Í: 'I', Î: 'I', Ï: 'I',
  Ñ: 'N', Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O', Ø: 'O',
  Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U', Ý: 'Y',
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i',
  ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y',
  ß: 'b', Æ: 'W', æ: 'w', Œ: 'W', œ: 'w',
};

export type FontName = 'Helvetica' | 'Helvetica-Bold';

/** Width of one character in 1/1000 em. */
function charWidth(ch: string, bold: boolean): number {
  const table = bold ? BOLD : REGULAR;
  const direct = table[ch];
  if (direct !== undefined) return direct;
  const base = BASE_LETTER[ch];
  if (base !== undefined) return table[base] ?? 556;
  // Punctuation and symbols we did not tabulate: use the digit width, which
  // is the most common advance in this font.
  return 556;
}

/** Width of a string at a given point size, in points. */
export function textWidth(text: string, size: number, bold = false): number {
  let total = 0;
  for (const ch of text) total += charWidth(ch, bold);
  return (total * size) / 1000;
}

/** Greedy word wrap to a maximum width in points. */
export function wrapText(text: string, size: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (textWidth(candidate, size, bold) <= maxWidth || line === '') {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line !== '') lines.push(line);
  }
  return lines;
}

// Code points that WinAnsiEncoding places in 0x80–0x9F rather than at their
// Unicode value. Without these, an em dash or a curly quote would silently
// become the wrong glyph.
const WIN_ANSI_SPECIAL: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84,
  '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88,
  '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c,
  'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93,
  '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b,
  'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
};

/**
 * Encode a PDF *text string* (document metadata, /Lang, outlines) as
 * UTF-16BE with a byte-order mark, written as a hex string.
 *
 * Text strings are PDFDocEncoding by default, which assigns different
 * glyphs to 0x80–0x9F than WinAnsi does — an em dash written as a WinAnsi
 * byte comes back as "Š" in the title bar. UTF-16BE is unambiguous and
 * covers every language a pack might ship.
 */
export function pdfTextString(text: string): string {
  let hex = 'FEFF';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) {
      // Surrogate pair.
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0').toUpperCase();
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0').toUpperCase();
    } else {
      hex += code.toString(16).padStart(4, '0').toUpperCase();
    }
  }
  return hex;
}

/**
 * Encode a string as a WinAnsi PDF literal string, escaping the characters
 * PDF syntax reserves. Used for page content, where the font's
 * WinAnsiEncoding governs. Characters outside WinAnsi degrade to '?' —
 * visible, rather than corrupting the byte stream.
 */
export function pdfString(text: string): string {
  let out = '';
  for (const ch of text) {
    const special = WIN_ANSI_SPECIAL[ch];
    const code = special ?? ch.codePointAt(0)!;
    if (ch === '(' || ch === ')' || ch === '\\') {
      out += `\\${ch}`;
    } else if (code < 32) {
      out += ' ';
    } else if (code < 127) {
      out += ch;
    } else if (code <= 255) {
      out += `\\${code.toString(8).padStart(3, '0')}`;
    } else {
      out += '?';
    }
  }
  return out;
}
