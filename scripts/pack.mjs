// Packs the extension for the Chrome Web Store and Edge Add-ons:
// dist/traders-toolbar-<version>.zip with manifest.json, src/, icons/ and LICENSE.
// No dependency: a plain zip writer on node:zlib. node scripts/pack.mjs
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { crc32 } from './crc32.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = ['manifest.json', 'LICENSE', ...walk(join(root, 'src')), ...walk(join(root, 'icons'))]
  .map((p) => (p.includes(sep) || p.includes('/') ? relative(root, p) : p).split(sep).join('/'))
  .filter((p) => !/\.test\.js$/.test(p));

const local = [];
const central = [];
let offset = 0;
for (const name of files) {
  const data = readFileSync(join(root, name));
  const packed = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const nameBuf = Buffer.from(name);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4);
  head.writeUInt16LE(0x0800, 6);
  head.writeUInt16LE(8, 8);
  head.writeUInt16LE(0, 10);
  head.writeUInt16LE(0x21, 12); // 1980-01-01: the same zip for the same files
  head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(packed.length, 18);
  head.writeUInt32LE(data.length, 22);
  head.writeUInt16LE(nameBuf.length, 26);
  local.push(head, nameBuf, packed);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0);
  cen.writeUInt16LE(20, 4);
  cen.writeUInt16LE(20, 6);
  cen.writeUInt16LE(0x0800, 8);
  cen.writeUInt16LE(8, 10);
  cen.writeUInt16LE(0, 12);
  cen.writeUInt16LE(0x21, 14);
  cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(packed.length, 20);
  cen.writeUInt32LE(data.length, 24);
  cen.writeUInt16LE(nameBuf.length, 28);
  cen.writeUInt32LE(offset, 42);
  central.push(cen, nameBuf);
  offset += head.length + nameBuf.length + packed.length;
}
const cenBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cenBuf.length, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', `traders-toolbar-${manifest.version}.zip`);
writeFileSync(out, Buffer.concat([...local, cenBuf, end]));
console.log(`${relative(root, out)}: ${files.length} files`);
files.forEach((f) => console.log(`  ${f}`));
