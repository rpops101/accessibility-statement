import { deflateRawSync } from 'node:zlib';

/**
 * Minimal, deterministic ZIP writer — vendored per DEPENDENCIES.md.
 *
 * A .docx is a ZIP, and every general-purpose ZIP library stamps entries
 * with the wall clock, which would break FR-ART-5 on the very first render.
 * Every entry here is written with a fixed DOS timestamp (1980-01-01) and
 * fixed metadata, so identical input produces identical bytes forever.
 *
 * Only what OOXML needs: no encryption, no ZIP64, no directory entries.
 */

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  name: string;
  data: string | Uint8Array;
  /**
   * Stored (uncompressed) rather than deflated. The OOXML spec wants
   * `mimetype`-style entries stored in some formats; unused for .docx but
   * kept because it costs one branch.
   */
  store?: boolean;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// 1980-01-01 00:00:00, the earliest timestamp the DOS format can express.
// Fixed rather than current, because determinism is a hard requirement.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Build a ZIP archive. Entry order is preserved and is part of the output. */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const raw = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    const deflated = entry.store ? raw : deflateRawSync(raw, { level: 9 });
    // Never let "compression" grow the entry.
    const useStore = entry.store || deflated.length >= raw.length;
    const body = useStore ? raw : new Uint8Array(deflated);
    const method = useStore ? 0 : 8;
    const crc = crc32(raw);

    const header = concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(method),
      u16(DOS_TIME),
      u16(DOS_DATE),
      u32(crc),
      u32(body.length),
      u32(raw.length),
      u16(name.length),
      u16(0), // extra field length
      name,
    ]);
    local.push(header, body);

    central.push(
      concat([
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed
        u16(0),
        u16(method),
        u16(DOS_TIME),
        u16(DOS_DATE),
        u32(crc),
        u32(body.length),
        u32(raw.length),
        u16(name.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk number start
        u16(0), // internal attributes
        u32(0), // external attributes
        u32(offset),
        name,
      ])
    );
    offset += header.length + body.length;
  }

  const centralBytes = concat(central);
  const eocd = concat([
    u32(0x06054b50),
    u16(0), // this disk
    u16(0), // disk with central directory
    u16(entries.length),
    u16(entries.length),
    u32(centralBytes.length),
    u32(offset),
    u16(0), // comment length
  ]);

  return concat([...local, centralBytes, eocd]);
}
