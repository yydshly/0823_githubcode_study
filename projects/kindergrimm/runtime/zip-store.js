const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function concat(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

async function toBytes(value) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  throw new TypeError('ZIP entry data must be string, Uint8Array, ArrayBuffer, or Blob');
}

const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (8 << 5) | 24;
const UTF8_FLAG = 0x0800;

export async function createStoredZip(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('ZIP requires at least one file');
  const names = new Set();
  const entries = [];
  for (const file of files) {
    if (!file?.name || typeof file.name !== 'string') throw new Error('ZIP entry name is required');
    if (names.has(file.name)) throw new Error(`Duplicate ZIP entry: ${file.name}`);
    names.add(file.name);
    const name = encoder.encode(file.name.replaceAll('\\', '/'));
    const data = await toBytes(file.data);
    entries.push({ name, data, crc: crc32(data), label: file.name });
  }

  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;
  for (const entry of entries) {
    const local = concat([
      u32(0x04034b50), u16(20), u16(UTF8_FLAG), u16(0), u16(DOS_TIME), u16(DOS_DATE),
      u32(entry.crc), u32(entry.data.length), u32(entry.data.length),
      u16(entry.name.length), u16(0), entry.name, entry.data
    ]);
    localChunks.push(local);

    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(UTF8_FLAG), u16(0), u16(DOS_TIME), u16(DOS_DATE),
      u32(entry.crc), u32(entry.data.length), u32(entry.data.length),
      u16(entry.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(localOffset), entry.name
    ]);
    centralChunks.push(central);
    localOffset += local.length;
  }

  const localBytes = concat(localChunks);
  const centralBytes = concat(centralChunks);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBytes.length), u32(localBytes.length), u16(0)
  ]);
  return new Blob([localBytes, centralBytes, end], { type: 'application/zip' });
}

export async function inspectStoredZip(value) {
  const bytes = await toBytes(value);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = [];
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compression = view.getUint16(offset + 8, true);
    const expectedCrc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const data = bytes.slice(dataStart, dataStart + size);
    entries.push({
      name: decoder.decode(bytes.slice(nameStart, nameStart + nameLength)),
      size,
      compression,
      crc32: expectedCrc.toString(16).padStart(8, '0'),
      crcValid: crc32(data) === expectedCrc
    });
    offset = dataStart + size;
  }
  return {
    mime: value instanceof Blob ? value.type : null,
    size: bytes.length,
    magic: [...bytes.slice(0, 4)].map(byte => byte.toString(16).padStart(2, '0')).join(' '),
    entries,
    allStored: entries.every(entry => entry.compression === 0),
    allCrcValid: entries.every(entry => entry.crcValid)
  };
}
