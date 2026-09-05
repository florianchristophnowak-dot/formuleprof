/**
 * Erzeugt die PNG-Symbole der App ohne zusätzliche Abhängigkeit.
 * Die Grafik greift die Gestaltung auf: dunkles Grün, cremefarbene Linie,
 * orangefarbene Markierungen.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'icons');

const GRUEN = [10, 42, 31];
const CREME = [242, 240, 232];
const ORANGE = [194, 98, 15];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function toPng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // Bittiefe
  header[9] = 2; // Truecolor
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // Filtertyp
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixels(x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Punkt der Streckenkurve für einen Anteil t (0–1). */
function curvePoint(t) {
  const p0 = [0.19, 0.78];
  const p1 = [0.42, 0.78];
  const p2 = [0.58, 0.22];
  const p3 = [0.81, 0.22];
  const inv = 1 - t;
  return [
    inv ** 3 * p0[0] + 3 * inv ** 2 * t * p1[0] + 3 * inv * t ** 2 * p2[0] + t ** 3 * p3[0],
    inv ** 3 * p0[1] + 3 * inv ** 2 * t * p1[1] + 3 * inv * t ** 2 * p2[1] + t ** 3 * p3[1],
  ];
}

const CURVE = Array.from({ length: 400 }, (_, index) => curvePoint(index / 399));

function drawing(size, padding) {
  const line = size * 0.068;
  const points = CURVE.map(([x, y]) => [x * size, y * size]);
  const flags = [
    [0.19 * size, 0.78 * size],
    [0.81 * size, 0.22 * size],
  ];
  const flagHalf = size * 0.052;

  return (x, y) => {
    // Rand
    if (padding > 0) {
      const border = size * 0.047;
      const inset = size * 0.031;
      const onBorder =
        (x >= inset && x < inset + border && y >= inset && y <= size - inset) ||
        (x <= size - inset && x > size - inset - border && y >= inset && y <= size - inset) ||
        (y >= inset && y < inset + border && x >= inset && x <= size - inset) ||
        (y <= size - inset && y > size - inset - border && x >= inset && x <= size - inset);
      if (onBorder) return ORANGE;
    }

    for (const [fx, fy] of flags) {
      if (Math.abs(x - fx) <= flagHalf && Math.abs(y - fy) <= flagHalf) return ORANGE;
    }

    for (const [px, py] of points) {
      if ((x - px) ** 2 + (y - py) ** 2 <= (line / 2) ** 2) return CREME;
    }

    return GRUEN;
  };
}

mkdirSync(outDir, { recursive: true });

const targets = [
  { name: 'icon-192.png', size: 192, padding: 1 },
  { name: 'icon-512.png', size: 512, padding: 1 },
  { name: 'icon-maskable-512.png', size: 512, padding: 0 },
];

for (const target of targets) {
  const png = toPng(target.size, drawing(target.size, target.padding));
  writeFileSync(resolve(outDir, target.name), png);
  console.log(`${target.name}: ${png.length} Byte`);
}
