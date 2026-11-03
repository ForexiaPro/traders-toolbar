// The popup in a normal tab, for design checks and store screenshots:
//   node scripts/preview.mjs            serves http://localhost:5175/dev/preview.html
//   node scripts/preview.mjs --shot out.png [shot.mjs]
// The feeds are fetched live here (no CORS in the way); a feed that is not live
// yet is served from dev/samples/ and the preview says so above the popup.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { URLS } from '../src/lib.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5175;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const SAMPLE = Object.fromEntries(Object.entries(URLS).map(([k, u]) => [u, k]));

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/proxy') {
    const target = url.searchParams.get('u');
    const key = SAMPLE[target];
    if (!key) return res.writeHead(403).end();
    try {
      const r = await fetch(target);
      if (r.ok) return res.writeHead(200, { 'content-type': 'application/json' }).end(Buffer.from(await r.arrayBuffer()));
    } catch {}
    const file = join(root, 'dev', 'samples', `${key}.json`);
    if (!existsSync(file)) return res.writeHead(404).end();
    return res.writeHead(200, { 'content-type': 'application/json', 'x-sample': key }).end(await readFile(file));
  }
  const path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root) || !existsSync(path)) return res.writeHead(404).end();
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});

server.listen(PORT, () => {
  const page = `http://localhost:${PORT}/dev/preview.html`;
  const i = process.argv.indexOf('--shot');
  if (i < 0) return console.log(page);
  const out = process.argv[i + 1] ?? 'docs/screenshot-popup.png';
  const shot = process.argv[i + 2] ?? join(root, '..', '..', 'scripts', 'shot.mjs');
  spawn(process.execPath, [shot, page, out, '360', '--full'], { stdio: 'inherit', cwd: root }).on('exit', (code) => {
    server.close();
    process.exitCode = code ?? 1;
  });
});
