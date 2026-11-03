// Draws the icons (16, 32, 48, 128 px) as PNGs with no dependency: a clock face
// on the network's dark ink, its hand on the accent. node scripts/icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { crc32 } from './crc32.mjs';

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const INK = [12, 18, 32];
const RING = [142, 162, 255];
const HAND = [61, 90, 254];
const LIVE = [245, 165, 36];

/** The colour at a point of the unit square (0..1), or null for transparent. */
function paint(x, y) {
  const r = 0.2;
  const qx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0);
  const qy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  if (qx * qx + qy * qy > r * r) return null;
  const dx = x - 0.5;
  const dy = y - 0.5;
  const d = Math.hypot(dx, dy);
  if (d > 0.29 && d < 0.355) return RING;
  // the hands: the minute hand at twelve, the hour hand near four
  const seg = (ax, ay, bx, by, w) => {
    const vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - (ax + t * vx), y - (ay + t * vy)) < w;
  };
  if (seg(0.5, 0.5, 0.5, 0.25, 0.04)) return HAND;
  if (seg(0.5, 0.5, 0.65, 0.58, 0.045)) return HAND;
  if (d < 0.06) return LIVE;
  return INK;
}

function draw(size) {
  const ss = 4;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const c = paint((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a++;
          }
        }
      const o = (y * size + x) * 4;
      if (a) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round((a / (ss * ss)) * 255);
      }
    }
  return png(size, out);
}

const dir = new URL('../icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(new URL(`icon${size}.png`, dir), draw(size));
  console.log(`icons/icon${size}.png`);
}
