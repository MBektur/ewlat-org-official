#!/usr/bin/env node
/**
 * menu.png → dönme dolap parçaları
 *
 *   node tools/build-wheel.mjs [kaynak menu.png] [çıktı klasörü]
 *   (varsayılan: preview/assets/images/menu.png → assets/images/wheel)
 *
 * Üretilenler:
 *   ring.webp    Çarkın dönen dilim halkası: orijinal bir dilimden (ikon/yazı temizlenmiş), 24 özdeş dilim, 360°
 *   icon-N.png   N. bağlantının (menu_item_N) yuvarlak logosu — saydam, yumuşak kenarlı
 *   hub.png      Sabit göbek: hilal + kitap okuyan çocuk + "ئەۋلاد گۇرۇپپىسى" (alt bacakları ve başı silinmiş)
 *   legs.png     Çocuğun alt bacakları (dizden aşağı) — dizden sallanır
 *   head.png     Çocuğun başı (takke + yüz) — boyundan hafifçe kalkıp iner
 *   wheel.json   Konumlar (menu.png pikselleri) — motion.js'deki WHEEL sabitine kopyalanır
 *
 * Yazılar resim değil, gerçek metindir (motion.js → WHEEL.labels).
 * menu.png değişirse bu aracı yeniden çalıştırın.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const SRC = process.argv[2] || 'preview/assets/images/menu.png';
const OUT = process.argv[3] || 'assets/images/wheel';

// menu.png geometrisi (ölçüldü): çark merkezi alt kenarın 3.5px altında, iç boşluk yarıçapı 397
const CX = 704.5, CY = 704.5, R_HUB = 394;
// app.css'teki .menu_item_N konumları (1120px genişlikte, 88px daireler)
const HOT = [[28, 454], [59, 330], [123, 214], [216, 123], [326, 59], [451, 25],
             [582, 24], [707, 56], [817, 122], [909, 215], [975, 326], [1007, 453]];
// Çocuğun alt bacakları: arama kutusu ve diz (dönme noktası)
const LEGS_BOX = [712, 548, 792, 632];       // x0, y0, x1, y1
const KNEE = [747, 565];
// Çocuğun başı: arama kutusu ve boyun (dönme noktası)
const HEAD_BOX = [664, 450, 718, 504];
const NECK = [690, 500], NECK_R = 7;

const src = PNG.sync.read(fs.readFileSync(SRC));
const W = src.width, H = src.height, D = src.data;
const K = W / 1120;
fs.mkdirSync(OUT, { recursive: true });

function at(x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const i = (y * W + x) * 4;
  return [D[i], D[i + 1], D[i + 2], D[i + 3]];
}
function bilinear(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const out = [0, 0, 0, 0];
  let ws = 0;
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const p = at(x0 + dx, y0 + dy);
    if (!p || !w) continue;
    for (let c = 0; c < 4; c++) out[c] += p[c] * w;
    ws += w;
  }
  return ws ? out.map(v => v / ws) : null;
}
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function writePNG(name, w, h, fill) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = fill(x, y);
    if (p) png.data.set(p.map(Math.round), (y * w + x) * 4);
  }
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
}

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
    const med = err.slice().sort((a, b) => a - b)[err.length >> 1];
    use = use.filter((_, j) => err[j] <= Math.max(1.5, med * 2.5));
  }
  return res;
}

/* ---------- 1. Yuvarlak logolar ---------- */
const icons = [];
HOT.forEach(([l, t], i) => {
  const sx = (l + 44) * K, sy = (t + 44) * K;           // app.css'teki sıcak nokta merkezi
  const pts = [];
  for (let a = 0; a < 360; a += 3) {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    const ref = at(sx + 74 * c, sy + 74 * s);              // dairenin dışındaki dilim rengi
    if (!ref || ref[3] < 250 || ref[0] > 92) continue;      // yazı ya da görsel dışı → atla
    for (let r = 74; r >= 40; r -= .5) {                    // dışarıdan içeri: ilk "farklı" piksel = kenar
      const p = bilinear(sx + r * c, sy + r * s);
      if (p && dist3(p, ref) > 40) { pts.push([sx + r * c, sy + r * s]); break; }
    }
  }
  const f = pts.length >= 12 ? fitCircle(pts) : { cx: sx, cy: sy, R: 55 };
  const R = Math.min(f.R, 60);
  const x0 = Math.floor(f.cx - R - 1), y0 = Math.floor(f.cy - R - 1), sz = Math.ceil(2 * R + 3);
  writePNG(`icon-${i}.png`, sz, sz, (x, y) => {
    const p = at(x0 + x, y0 + y);
    if (!p) return null;
    const a = Math.max(0, Math.min(1, R + .5 - Math.hypot(x0 + x + .5 - f.cx, y0 + y + .5 - f.cy)));
    return [p[0], p[1], p[2], p[3] * a];
  });
  icons.push([+f.cx.toFixed(1), +f.cy.toFixed(1), +R.toFixed(1)]);
  console.log(`icon ${i}: (${f.cx.toFixed(1)}, ${f.cy.toFixed(1)}) r=${R.toFixed(1)}  kenar noktası=${pts.length}`);
});

/* ---------- 2. Çocuğun alt bacakları ---------- */
// Bacak pikseli: opak ve beyaz olmayan (gri pantolon, kahverengi ayakkabı); hilal beyaz, zemin saydam.
const [bx0, by0, bx1, by1] = LEGS_BOX;
const isLeg = (x, y) => {
  if (x < bx0 || x > bx1 || y < by0 || y > by1) return false;
  const p = at(x, y);
  if (!p || p[3] < 30) return false;
  if (Math.min(p[0], p[1], p[2]) > 205) return false;        // hilal (beyaz)
  // diz çizgisinin üstü uyluktur (göbekte sabit kalır): dizden geçen hafif eğik çizgi
  return y >= KNEE[1] - 2 + (KNEE[0] - x) * .9;
};
const KNEE_R = 12;                                           // diz kapağı: dönme noktası merkezli disk
const KNEE_KEEP = 26;                                        // göbekte dizin bu yarıçapı içindeki pantolon korunur
const isKneeCap = (x, y) => {
  if (Math.hypot(x + .5 - KNEE[0], y + .5 - KNEE[1]) > KNEE_R) return false;
  const p = at(x, y);
  return p && p[3] > 30 && Math.min(p[0], p[1], p[2]) <= 205;
};
const leg = new Uint8Array(W * H);
for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (isLeg(x, y)) leg[y * W + x] = 1;
// kenar yumuşatma pikselleri de dahil olsun (1px genişlet)
const legGrow = new Uint8Array(leg);
for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
  if (!leg[y * W + x]) continue;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const X = x + dx, Y = y + dy, p = at(X, Y);
    if (p && p[3] > 0 && !(Math.min(p[0], p[1], p[2]) > 235 && p[3] > 200)) legGrow[Y * W + X] = 1;
  }
}
// Sallanan parça = alt bacaklar + diz kapağı (diz kapağı göbekte de kalır; parça onu üstten örter,
// kendi merkezinde döndüğü için uyluk ile bacak arasında hiçbir açıda boşluk açılmaz)
const sprite = new Uint8Array(legGrow);
for (let y = KNEE[1] - KNEE_R - 1; y <= KNEE[1] + KNEE_R + 1; y++)
  for (let x = KNEE[0] - KNEE_R - 1; x <= KNEE[0] + KNEE_R + 1; x++) if (isKneeCap(x, y)) sprite[y * W + x] = 1;
let lx0 = W, ly0 = H, lx1 = 0, ly1 = 0;
for (let y = by0 - 16; y <= by1 + 2; y++) for (let x = bx0 - 2; x <= bx1 + 2; x++) if (sprite[y * W + x]) {
  lx0 = Math.min(lx0, x); ly0 = Math.min(ly0, y); lx1 = Math.max(lx1, x); ly1 = Math.max(ly1, y);
}
writePNG('legs.png', lx1 - lx0 + 1, ly1 - ly0 + 1, (x, y) => sprite[(ly0 + y) * W + lx0 + x] ? at(lx0 + x, ly0 + y) : null);

// Bacakların altında kalan yeri doldur: hilali geometrik olarak modelle (dış daire − iç daire)
// ve silinen piksellerde hilali yeniden çiz (kenarı yumuşatılmış beyaz), dışarısı saydam.
const isWhite = (x, y) => { const p = at(x, y); return p && p[3] > 200 && Math.min(p[0], p[1], p[2]) > 205; };
const outerPts = [], innerPts = [];
for (let y = 415; y <= 600; y += 3) for (let x = 590; x < 720; x++) if (isWhite(x, y)) { outerPts.push([x, y]); break; }        // sol kenar
for (let x = 620; x <= 712; x += 3) for (let y = 640; y > 540; y--) if (isWhite(x, y)) { outerPts.push([x, y + 1]); break; }   // alt kenar
for (let y = 415; y <= 455; y += 3) {                                                                                       // iç kenar (üst)
  let seen = false;
  for (let x = 590; x < 760; x++) { if (isWhite(x, y)) seen = true; else if (seen) { innerPts.push([x, y]); break; } }
}
for (let x = 776; x <= 798; x += 2) for (let y = 540; y < 600; y++) if (isWhite(x, y)) { innerPts.push([x, y]); break; }    // boynuz üst yüzü
const OUTER = fitCircle(outerPts), INNER = fitCircle(innerPts);
console.log('hilal dış', OUTER, ' iç', INNER);
function behind(x, y) {
  const a = Math.min(1, Math.max(0, OUTER.R + .5 - Math.hypot(x + .5 - OUTER.cx, y + .5 - OUTER.cy))) *
            Math.min(1, Math.max(0, Math.hypot(x + .5 - INNER.cx, y + .5 - INNER.cy) - INNER.R + .5));
  return a > 0 ? [255, 255, 255, 255 * a] : null;
}

/* ---------- 2b. Çocuğun başı (takke + yüz), boyundan hafifçe kalkıp iner ---------- */
// Boyun çizgisinin (yakanın üst kenarı, hafif eğik) üstündeki opak pikseller. Arkası hilalin iç boşluğu → saydam.
const [hb0x, hb0y, hb1x, hb1y] = HEAD_BOX;
const neckLine = x => NECK[1] + (x - NECK[0]) * .15;
const head = new Uint8Array(W * H);
for (let y = hb0y; y <= hb1y; y++) for (let x = hb0x; x <= hb1x; x++) {
  const p = at(x, y);
  if (p && p[3] > 0 && y < neckLine(x)) head[y * W + x] = 1;
}
// Boyun kapağı: dönme noktası merkezli disk — baş kalkıp inerken boyunda boşluk açılmasın
const headSprite = new Uint8Array(head);
for (let y = NECK[1] - NECK_R - 1; y <= NECK[1] + NECK_R + 1; y++)
  for (let x = NECK[0] - NECK_R - 1; x <= NECK[0] + NECK_R + 1; x++) {
    const p = at(x, y);
    if (p && p[3] > 30 && Math.hypot(x + .5 - NECK[0], y + .5 - NECK[1]) <= NECK_R) headSprite[y * W + x] = 1;
  }
let ex0 = W, ey0 = H, ex1 = 0, ey1 = 0;
for (let y = hb0y; y <= NECK[1] + NECK_R + 1; y++) for (let x = hb0x - NECK_R; x <= hb1x + NECK_R; x++) if (headSprite[y * W + x]) {
  ex0 = Math.min(ex0, x); ey0 = Math.min(ey0, y); ex1 = Math.max(ex1, x); ey1 = Math.max(ey1, y);
}
writePNG('head.png', ex1 - ex0 + 1, ey1 - ey0 + 1, (x, y) => headSprite[(ey0 + y) * W + ex0 + x] ? at(ex0 + x, ey0 + y) : null);

/* ---------- 3. Sabit göbek (alt bacaklar ve baş silinmiş) ---------- */
const hx0 = Math.floor(CX - R_HUB), hy0 = Math.floor(CY - R_HUB), hx1 = Math.ceil(CX + R_HUB), hy1 = H - 1;
writePNG('hub.png', hx1 - hx0 + 1, hy1 - hy0 + 1, (x, y) => {
  const X = hx0 + x, Y = hy0 + y;
  const r = Math.hypot(X + .5 - CX, Y + .5 - CY);
  if (r > R_HUB) return null;
  if (head[Y * W + X]) return behind(X, Y);
  if (legGrow[Y * W + X]) {
    // Diz çevresinde orijinal pantolonu bırak: bacak sallanınca dizin arkasında boşluk açılmasın
    if (Math.hypot(X + .5 - KNEE[0], Y + .5 - KNEE[1]) < KNEE_KEEP) return at(X, Y);
    return behind(X, Y);
  }
  return at(X, Y);
});

/* ---------- 4. ring.webp — orijinal dilimlerden temiz, 24 dilimli tam çark ---------- */
// İkon ve yazıları maskele, her dilimi kutupsal dokuya çevir, maskelenen yerleri komşularla doldur.
const RIN = 397, ROUT = 704, STEP = 15;
const mask = new Uint8Array(W * H);
for (const [cx, cy, R] of icons) {
  const rr = R + 11;                                         // ikon gölgesi dahil
  for (let y = Math.floor(cy - rr); y <= cy + rr; y++)
    for (let x = Math.floor(cx - rr); x <= cx + rr; x++)
      if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x - cx, y - cy) <= rr) mask[y * W + x] = 1;
}
const bright = new Uint8Array(W * H);                        // beyaz yazılar
for (let i = 0; i < W * H; i++) if (D[i * 4 + 3] > 100 && D[i * 4] > 75) bright[i] = 1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!bright[y * W + x]) continue;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const X = x + dx, Y = y + dy;
    if (X >= 0 && Y >= 0 && X < W && Y < H) mask[Y * W + X] = 1;
  }
}
const U = 220, R0 = RIN - 4, ROWS = ROUT - R0 + 1;
const tex = [];
for (let k = 0; k < 12; k++) {
  const px = new Float32Array(ROWS * U * 4), known = new Uint8Array(ROWS * U);
  for (let row = 0; row < ROWS; row++) for (let u = 0; u < U; u++) {
    const th = (k * STEP + (u + .5) / U * STEP) * Math.PI / 180, r = R0 + row;
    const x = CX + r * Math.cos(th), y = CY - r * Math.sin(th);
    const mx = Math.round(x), my = Math.round(y);
    if (mx < 0 || my < 0 || mx >= W || my >= H || mask[my * W + mx]) continue;
    const p = bilinear(x, y);
    if (p) { px.set(p, (row * U + u) * 4); known[row * U + u] = 1; }
  }
  const out = new Float32Array(px);                         // 4 yönlü ters-mesafe ağırlıklı doldurma
  for (let row = 0; row < ROWS; row++) for (let u = 0; u < U; u++) {
    const j = row * U + u;
    if (known[j]) continue;
    const acc = [0, 0, 0, 0]; let ws = 0;
    for (const [du, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let uu = u, rr = row, d = 0;
      for (;;) { uu += du; rr += dr; d++; if (uu < 0 || uu >= U || rr < 0 || rr >= ROWS) { d = 0; break; } if (known[rr * U + uu]) break; }
      if (!d) continue;
      const dist = du ? d * (R0 + row) * (STEP * Math.PI / 180) / U : d, w = 1 / (dist * dist), q = (rr * U + uu) * 4;
      for (let c = 0; c < 4; c++) acc[c] += px[q + c] * w;
      ws += w;
    }
    if (ws) for (let c = 0; c < 4; c++) out[j * 4 + c] = acc[c] / ws;
  }
  tex.push(out);
}
function texSample(k, row, u) {
  row = Math.max(0, Math.min(ROWS - 1, row)); u = Math.max(0, Math.min(U - 1.001, u));
  const u0 = Math.floor(u), r0 = Math.floor(row), f = u - u0, g = row - r0, u1 = Math.min(U - 1, u0 + 1), r1 = Math.min(ROWS - 1, r0 + 1);
  const t = tex[k], o = [0, 0, 0, 0];
  for (const [rr, uu, w] of [[r0, u0, (1 - f) * (1 - g)], [r0, u1, f * (1 - g)], [r1, u0, (1 - f) * g], [r1, u1, f * g]]) {
    const q = (rr * U + uu) * 4;
    for (let c = 0; c < 4; c++) o[c] += t[q + c] * w;
  }
  return o;
}
// Çıktı: kare, dış kenar = RING_SIZE/2. Bant (orijinalde 393→704) iç/dış oranı korunarak sıkıştırılır:
// iç kenar = RING_INNER (menü 1120px ölçeğinde 316), dış kenar = RING_OUTER — motion.js R_HUB / R_EDGE ile aynı olmalı.
const RING_SIZE = 1440, RING_INNER = 316, RING_OUTER = 520;
const RING_BORDER = 3;                                      // kenar çizgisi kalınlığı (halka görselinin pikseli; 3 ≈ 2px ekranda)
const RING_WEDGE = 5;                                       // örnek alınan orijinal dilim (0 = sağ, 11 = sol)
const ro = RING_SIZE / 2, ri = ro * RING_INNER / RING_OUTER;
// Dilim sayısı motion.js'teki SLOTS ile aynı olmalı (logo = dilim ortası):
//   ring.webp    → 24 dilim (geniş ekran, her logo karşılıklı iki kez)
//   ring-12.webp → 12 dilim (dar ekran / COMPACT, her logo bir kez)
for (const [SLOTS, FILE] of [[24, 'ring.webp'], [12, 'ring-12.webp']]) {
const SLOT = 360 / SLOTS;
const ring = Buffer.alloc(RING_SIZE * RING_SIZE * 4);
for (let y = 0; y < RING_SIZE; y++) for (let x = 0; x < RING_SIZE; x++) {
  const dx = x + .5 - ro, dy = ro - (y + .5), rho = Math.hypot(dx, dy);
  if (rho < ri - 1 || rho > ro + 1) continue;
  let th = Math.atan2(dy, dx) * 180 / Math.PI; if (th < 0) th += 360;
  const j = Math.min(SLOTS - 1, Math.floor(th / SLOT));
  // Bütün dilimler aynı: orijinaldeki tek bir dilimin dokusu (sınır gölgesi + iç bant dahil),
  // dilim genişliğine göre açısal olarak gerilir
  const k = RING_WEDGE;
  const u = (th - j * SLOT) / SLOT * U - .5;
  const r = R0 + (rho - ri) / (ro - ri) * (ROUT - R0);
  const p = texSample(k, r - R0, u);
  const edge = Math.min(1, Math.max(0, ro + .5 - rho)) * Math.min(1, Math.max(0, rho - ri + .5));
  // İç ve dış çember kenar çizgisi: çemberin kendi renginin koyu tonu + hemen içinde ince açık parlama
  const dEdge = Math.min(rho - ri, ro - rho);
  const line = Math.min(1, Math.max(0, RING_BORDER + .5 - dEdge));                        // kenar çizgisi
  const glow = Math.min(1, Math.max(0, 1 - Math.abs(dEdge - RING_BORDER - 1.2) / 1.2)) * .5; // parlama
  const c = [0, 1, 2].map(i => {
    const dark = p[i] * .6, light = Math.min(255, p[i] * 1.22 + 10);
    return p[i] * (1 - line - glow) + dark * line + light * glow;
  });
  const o = (y * RING_SIZE + x) * 4;
  ring[o] = c[0]; ring[o + 1] = c[1]; ring[o + 2] = c[2]; ring[o + 3] = Math.round(p[3] * edge);
}
await sharp(ring, { raw: { width: RING_SIZE, height: RING_SIZE, channels: 4 } })
  .webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(path.join(OUT, FILE));
}

const data = {
  size: [W, H], icons, ring: { inner: RING_INNER, outer: RING_OUTER },
  hub: [hx0, hy0, hx1 - hx0 + 1, hy1 - hy0 + 1],
  legs: [lx0, ly0, lx1 - lx0 + 1, ly1 - ly0 + 1], knee: KNEE,
  head: [ex0, ey0, ex1 - ex0 + 1, ey1 - ey0 + 1], neck: NECK
};
fs.writeFileSync(path.join(OUT, 'wheel.json'), JSON.stringify(data));
console.log('hub', data.hub, ' legs', data.legs, ' knee', KNEE, ' head', data.head, ' neck', NECK);
console.log('→', OUT);
