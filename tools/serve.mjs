#!/usr/bin/env node
/**
 * Yerel önizleme sunucusu:  npm run preview  →  http://localhost:8080/preview/
 *
 * Depo kökünü statik olarak sunar ve popup.php isteklerini https://ewlat.org/popup.php'ye aktarır.
 * Neden: popup.php "X-Frame-Options: SAMEORIGIN" ile geliyor; doğrudan ewlat.org'dan yüklenince
 * localhost'taki iframe'de gösterilmez. Proxy sayesinde tarayıcı onu aynı kökenden gelmiş sayar.
 * (Vercel'de aynı işi vercel.json'daki "rewrites" kuralı yapar.)
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = +(process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // /popup.php ve /preview/popup.php → ewlat.org
  if (url.pathname.endsWith('/popup.php')) {
    const up = https.get('https://ewlat.org/popup.php' + url.search, { headers: { 'user-agent': req.headers['user-agent'] || 'Mozilla/5.0' } }, r => {
      res.writeHead(r.statusCode, { 'content-type': r.headers['content-type'] || 'text/html; charset=utf-8' });
      r.pipe(res);
    });
    up.on('error', e => { res.writeHead(502); res.end('proxy error: ' + e.message); });
    return;
  }

  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err2, buf) => {
      if (err2) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(buf);
    });
  });
}).listen(PORT, () => console.log(`önizleme: http://localhost:${PORT}/preview/`));
