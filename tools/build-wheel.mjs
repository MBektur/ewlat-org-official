#!/usr/bin/env node
/**
 * menu.png → dönme dolap parçaları
 *
 *   node tools/build-wheel.mjs [kaynak menu.png] [çıktı klasörü]
 *   (varsayılan: preview/assets/images/menu.png → assets/images/wheel)
 *
 * Üretilenler:
 *   icon-N.png      N. bağlantının yuvarlak ikonu (saydam)
 *   label-N.png     N. bağlantının yazısı (beyaz, saydam)
 *   wheel.json      Konumlar (menu.png piksel koordinatlarında) — motion.js'deki WHEEL sabitine kopyalanır
 *
 * menu.png değişirse bu aracı yeniden çalıştırın.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SRC = process.argv[2] || 'preview/assets/images/menu.png';
const OUT = process.argv[3] || 'assets/images/wheel';

// menu.png geometrisi (ölçüldü): merkez alt kenarın 3.5px altında, dilimler 15°
const CX = 704.5, CY = 704.5, RIN = 397, ROUT = 704, STEP = 15;
// app.css'teki .menu_item_N konumları (1120px genişlikte, 88px daireler)
const HOT = [[28, 454], [59, 330], [123, 214], [216, 123], [326, 59], [451, 25],
             [582, 24], [707, 56], [817, 122], [909, 215], [975, 326], [1007, 453]];

const src = PNG.sync.read(fs.readFileSync(SRC));
const W = src.width, H = src.height, D = src.data;
const K = W / 1120;
fs.mkdirSync(OUT, { recursive: true });

const idx = (x, y) => (y * W + x) * 4;
function at(x, y) {                       // en yakın piksel (dışarıda null)
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const i = idx(x, y);
  return [D[i], D[i + 1], D[i + 2], D[i + 3]];
}
function bilinear(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const out = [0, 0, 0, 0];
  let wsum = 0;
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const p = at(x0 + dx, y0 + dy);
    if (!p || w === 0) continue;
    for (let c = 0; c < 4; c++) out[c] += p[c] * w;
    wsum += w;
  }
  if (!wsum) return null;
  return out.map(v => v / wsum);
}
const polar = (x, y) => {
  const dx = x - CX, dy = CY - y;
  let th = Math.atan2(dy, dx) * 180 / Math.PI;
  if (th < 0) th += 360;
  return { r: Math.hypot(dx, dy), th };
};
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Cebirsel daire uydurma (Kåsa), aykırı noktalar atılarak 3 tur
function fitCircle(pts) {
  let use = pts.slice(), res = null;
  for (let pass = 0; pass < 3; pass++) {
    const n = use.length;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    for (const [x, y] of use) {
      const z = x * x + y * y;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
    }
    // [sxx sxy sx; sxy syy sy; sx sy n] · [a b c] = [-sxz -syz -sz]
    const M = [[sxx, sxy, sx, -sxz], [sxy, syy, sy, -syz], [sx, sy, n, -sz]];
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const f = M[j][i] / M[i][i];
      for (let c = i; c < 4; c++) M[j][c] -= f * M[i][c];
    }
    const v = [0, 0, 0];
    for (let i = 2; i >= 0; i--) v[i] = (M[i][3] - M[i].slice(i + 1, 3).reduce((s, m, j) => s + m * v[i + 1 + j], 0)) / M[i][i];
    const cx = -v[0] / 2, cy = -v[1] / 2, R = Math.sqrt(cx * cx + cy * cy - v[2]);
    res = { cx, cy, R };
    const err = use.map(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - R));
    const sorted = err.slice().sort((a, b) => a - b), med = sorted[sorted.length >> 1];
    use = use.filter((_, j) => err[j] <= Math.max(1.5, med * 2.5));
  }
  return res;
}

/* ---------- 1. İkon dairelerini bul: merkezden dışa kenar taraması ---------- */
const items = HOT.map(([l, t], i) => {
  const sx = (l + 44) * K, sy = (t + 44) * K;   // app.css'teki sıcak nokta merkezi
  const pts = [];
  for (let a = 0; a < 360; a += 3) {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    const ref = at(sx + 74 * c, sy + 74 * s);    // dairenin dışındaki dilim rengi
    if (!ref || ref[3] < 250 || ref[0] > 92) continue;   // yazı ya da görsel dışı → atla
    for (let r = 74; r >= 40; r -= .5) {           // dışarıdan içeri: ilk "farklı" piksel = kenar
      const p = bilinear(sx + r * c, sy + r * s);
      if (p && dist3(p, ref) > 40) { pts.push([sx + r * c, sy + r * s]); break; }
    }
  }
  const f = pts.length >= 12 ? fitCircle(pts) : { cx: sx, cy: sy, R: 55 };
  const { th } = polar(f.cx, f.cy);
  return { i, k: Math.floor(th / STEP), cx: f.cx, cy: f.cy, R: Math.min(f.R, 60), n: pts.length };
});

/* ---------- 2. İçerik maskesi (ikon diskleri + beyaz yazı) ---------- */
const mask = new Uint8Array(W * H);
for (const it of items) {
  const rr = it.R + 11;                    // ikon gölgesi dahil
  for (let y = Math.floor(it.cy - rr); y <= it.cy + rr; y++)
    for (let x = Math.floor(it.cx - rr); x <= it.cx + rr; x++)
      if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x - it.cx, y - it.cy) <= rr) mask[y * W + x] = 1;
}
const white = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y);
  if (D[i + 3] > 100 && D[i] > 75) white[y * W + x] = 1;
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // 5px genişlet (kenar yumuşatma + gölge)
  if (!white[y * W + x]) continue;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const X = x + dx, Y = y + dy;
    if (X >= 0 && Y >= 0 && X < W && Y < H) mask[Y * W + X] = 1;
  }
}

/* ---------- 3. Her dilim için temiz kutupsal doku (içeriği komşularla doldur) ----------
   Yazıları arka plandan ayırmak için kullanılır (yazı alfası = piksel − temiz arka plan). */
const U = 220;                              // açısal sütun
const R0 = RIN - 4, ROWS = ROUT - R0 + 1;   // radyal satır
const tex = [];
for (let k = 0; k < 12; k++) {
  const px = new Float32Array(ROWS * U * 4);
  const known = new Uint8Array(ROWS * U);
  for (let row = 0; row < ROWS; row++) {
    const r = R0 + row;
    for (let u = 0; u < U; u++) {
      const th = (k * STEP + (u + .5) / U * STEP) * Math.PI / 180;
      const x = CX + r * Math.cos(th), y = CY - r * Math.sin(th);
      const p = bilinear(x, y);
      const j = row * U + u;
      const mx = Math.round(x), my = Math.round(y);
      const inside = mx >= 0 && my >= 0 && mx < W && my < H;
      if (p && inside && !mask[my * W + mx]) {
        px.set(p, j * 4); known[j] = 1;
      }
    }
  }
  // 4 yönlü ters-mesafe ağırlıklı doldurma
  const filled = new Float32Array(px);
  for (let row = 0; row < ROWS; row++) for (let u = 0; u < U; u++) {
    const j = row * U + u;
    if (known[j]) continue;
    const acc = [0, 0, 0, 0]; let ws = 0;
    for (const [du, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let uu = u, rr = row, d = 0;
      while (true) {
        uu += du; rr += dr; d++;
        if (uu < 0 || uu >= U || rr < 0 || rr >= ROWS) { d = 0; break; }
        if (known[rr * U + uu]) break;
      }
      if (!d) continue;
      // açısal mesafeyi piksele çevir (yaklaşık yay uzunluğu)
      const dist = du ? d * (R0 + row) * (STEP * Math.PI / 180) / U : d;
      const w = 1 / (dist * dist);
      const q = (rr * U + uu) * 4;
      for (let c = 0; c < 4; c++) acc[c] += px[q + c] * w;
      ws += w;
    }
    if (ws) for (let c = 0; c < 4; c++) filled[j * 4 + c] = acc[c] / ws;
  }
  tex.push(filled);
}
function texSample(k, row, u) {            // u ∈ [0, U)
  row = Math.max(0, Math.min(ROWS - 1, row));
  const u0 = Math.max(0, Math.min(U - 1, Math.floor(u))), u1 = Math.min(U - 1, u0 + 1), f = Math.max(0, Math.min(1, u - u0));
  const r0 = Math.floor(row), r1 = Math.min(ROWS - 1, r0 + 1), g = row - r0;
  const t = tex[k], o = [0, 0, 0, 0];
  for (const [rr, uu, w] of [[r0, u0, (1 - f) * (1 - g)], [r0, u1, f * (1 - g)], [r1, u0, (1 - f) * g], [r1, u1, f * g]]) {
    const q = (rr * U + uu) * 4;
    for (let c = 0; c < 4; c++) o[c] += t[q + c] * w;
  }
  return o;
}

// Temiz arka planın orijinal koordinatlardaki değeri (yazı çıkarmak için)
function cleanAt(x, y) {
  const { r, th } = polar(x + .5, y + .5);
  if (r < R0 || r > ROUT || th > 180) return null;
  const k = Math.min(11, Math.floor(th / STEP));
  return texSample(k, r - R0, (th - k * STEP) / STEP * U - .5);
}

/* ---------- 5. İkonlar ve yazılar ---------- */
const data = { size: [W, H], center: [CX, CY], rIn: RIN, rOut: ROUT, items: [] };
for (const it of items) {
  // ikon: yumuşak kenarlı daire kırpma
  const R = it.R, x0 = Math.floor(it.cx - R - 1), y0 = Math.floor(it.cy - R - 1), sz = Math.ceil(2 * R + 3);
  const icon = new PNG({ width: sz, height: sz });
  for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
    const p = at(x0 + x, y0 + y), o = (y * sz + x) * 4;
    const d = Math.hypot(x0 + x + .5 - it.cx, y0 + y + .5 - it.cy);
    const a = Math.max(0, Math.min(1, R + .5 - d));
    if (!p) continue;
    icon.data[o] = p[0]; icon.data[o + 1] = p[1]; icon.data[o + 2] = p[2]; icon.data[o + 3] = p[3] * a;
  }
  fs.writeFileSync(path.join(OUT, `icon-${it.i}.png`), PNG.sync.write(icon));

  // yazı: dilim içindeki, ikon dışındaki beyaz pikseller → beyaz + alfa
  const lo = it.k * STEP + .7, hi = (it.k + 1) * STEP - .7;
  const A = new Float32Array(W * H);
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const { r, th } = polar(x + .5, y + .5);
    if (r < RIN + 3 || r > ROUT - 3 || th < lo || th > hi) continue;
    if (Math.hypot(x + .5 - it.cx, y + .5 - it.cy) < it.R + 5) continue;
    const p = at(x, y), b = cleanAt(x, y);
    if (!p || !b) continue;
    const Lp = .3 * p[0] + .59 * p[1] + .11 * p[2], Lb = .3 * b[0] + .59 * b[1] + .11 * b[2];
    let a = (Lp - Lb) / (255 - Lb);
    if (a < .07) continue;
    a = Math.min(1, a);
    A[y * W + x] = a;
    if (a > .25) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  }
  bx0 -= 2; by0 -= 2; bx1 += 2; by1 += 2;
  const lw = bx1 - bx0 + 1, lh = by1 - by0 + 1;
  const label = new PNG({ width: lw, height: lh });
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const o = (y * lw + x) * 4, X = bx0 + x, Y = by0 + y;
    label.data[o] = label.data[o + 1] = label.data[o + 2] = 255;
    label.data[o + 3] = (X >= 0 && Y >= 0 && X < W && Y < H) ? Math.round(A[Y * W + X] * 255) : 0;
  }
  fs.writeFileSync(path.join(OUT, `label-${it.i}.png`), PNG.sync.write(label));

  data.items.push({
    i: it.i, wedge: it.k,
    icon: [+(it.cx).toFixed(1), +(it.cy).toFixed(1), +R.toFixed(1)],
    label: [bx0, by0, lw, lh]
  });
  console.log(`item ${it.i}: wedge ${it.k} pts=${it.n} icon (${it.cx.toFixed(1)}, ${it.cy.toFixed(1)}) r=${R.toFixed(1)}  label ${lw}×${lh} @ ${bx0},${by0}`);
}
fs.writeFileSync(path.join(OUT, 'wheel.json'), JSON.stringify(data));
console.log('→', OUT);
