// Serves the app on your network so a phone on the same Wi-Fi can open it.
//   node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const port = Number(process.argv[2]) || 8140;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png',
};

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => {
  console.log(`Waymark is running at http://localhost:${port}`);
  for (const list of Object.values(networkInterfaces()))
    for (const n of list) if (n.family === 'IPv4' && !n.internal) console.log(`On your phone: http://${n.address}:${port}`);
});
