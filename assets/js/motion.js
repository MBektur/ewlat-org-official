/*!
 * ewlat.org — Animasyon & Etkileşim Katmanı
 * Bağımlılık yok (vanilla JS). Stiller: assets/css/motion.css (Tailwind v4, "tw:" önekli).
 * Kurulum: </body> öncesine  <script src="assets/js/motion.js" defer></script>
 *
 * Her modül try/catch içinde çalışır; biri hata verirse site ve diğer modüller etkilenmez.
 * "Hareketi azalt" (prefers-reduced-motion) açıksa tüm hareket kapanır, sayfa statik kalır.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  var MOTION = !mq('(prefers-reduced-motion: reduce)');
  var FINE = mq('(hover: hover) and (pointer: fine)');

  root.classList.add('ew-js');
  if (MOTION) root.classList.add('ew-motion');

  /* ------------------------------------------------------------------ */
  /* Yardımcılar                                                         */
  /* ------------------------------------------------------------------ */
  var LANG = (typeof window.pageLang === 'string' && window.pageLang) || 'ug';
  var I18N = {
    soon:    { ug: 'يېقىندا', ul: 'Yéqinda', uc: 'Йеқинда', tr: 'Yakında', en: 'Coming soon', ar: 'قريباً' },
    loading: { ug: 'يۈكلىنىۋاتىدۇ…', ul: 'Yüklüniwatidu…', uc: 'Йүклиниватиду…', tr: 'Yükleniyor…', en: 'Loading…', ar: 'جارٍ التحميل…' }
  };
  function t(key) { var m = I18N[key]; return m[LANG] || m.ug; }

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function el(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function safe(name, fn) {
    try { fn(); } catch (e) { if (window.console) console.warn('[ewlat-motion] ' + name + ':', e); }
  }

  function debounce(fn, ms) {
    var id;
    return function () { clearTimeout(id); id = setTimeout(fn, ms); };
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOut(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  /** Hedef ekranda ve sekme görünürken çalışan requestAnimationFrame döngüsü. */
  function runWhileVisible(target, frame) {
    var running = false, inView = true, raf = 0, last = 0;
    function tick(now) {
      if (!running) return;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      frame(dt, now);
      raf = requestAnimationFrame(tick);
    }
    function update() {
      var should = inView && !doc.hidden;
      if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(tick); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; update(); }).observe(target);
    }
    doc.addEventListener('visibilitychange', update);
    update();
  }

  /** Canvas'ı CSS boyutuna ve ekran yoğunluğuna eşitler. */
  function fitCanvas(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth, h = cv.clientHeight;
    var W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /** Görünür olunca .ew-in ekler (bir kez). */
  function revealOnScroll(nodes, threshold) {
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) { nodes.forEach(function (n) { n.classList.add('ew-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ew-in'); io.unobserve(e.target); }
      });
    }, { threshold: threshold || .15 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------------------ */
  /* 1. HERO — canlı dünya haritası: diaspora noktaları + ışık yayları    */
  /* ------------------------------------------------------------------ */
  safe('hero', function () {
    var top = $('.top');
    if (!top) return;
    var bg = getComputedStyle(top).backgroundImage;
    var m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (!m) return;

    var wrap = el('div', 'tw:absolute tw:inset-0 tw:overflow-hidden tw:pointer-events-none', { 'aria-hidden': 'true' });
    var layer = el('div', 'ew-hero-layer tw:absolute tw:-inset-4 tw:bg-no-repeat tw:bg-top tw:bg-cover tw:will-change-transform');
    layer.style.backgroundImage = bg;
    wrap.appendChild(layer);
    top.insertBefore(wrap, top.firstChild);
    top.classList.add('ew-hero-ready');

    if (!MOTION) return;

    var cv = el('canvas', 'tw:absolute tw:inset-0 tw:size-full');
    layer.appendChild(cv);

    // bg.jpg (1920×629) için ölçülmüş Miller projeksiyonu
    var CAL = { w: 1920, h: 629, x0: 932, kx: 3.31, y0: 427, ky: 189.6 };
    function geo(lat, lon) {
      var Y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));
      return [CAL.x0 + CAL.kx * lon, CAL.y0 - CAL.ky * Y];
    }
    // home: ana vatan (Doğu Türkistan); diğerleri dünyadaki Uygur toplulukları
    var CITIES = [
      { ll: [39.47, 75.99], home: 1 }, { ll: [43.83, 87.62], home: 1 }, { ll: [37.11, 79.93], home: 1 },
      { ll: [43.91, 81.28], home: 1 }, { ll: [42.95, 89.19], home: 1 },
      { ll: [43.24, 76.89] }, { ll: [42.87, 74.59] }, { ll: [41.30, 69.24] }, { ll: [41.01, 28.98] },
      { ll: [38.72, 35.49] }, { ll: [48.14, 11.58] }, { ll: [52.37, 4.90] }, { ll: [59.33, 18.07] },
      { ll: [51.51, -0.13] }, { ll: [38.91, -77.04] }, { ll: [43.65, -79.38] }, { ll: [49.28, -123.12] },
      { ll: [35.68, 139.69] }, { ll: [21.39, 39.86] }, { ll: [30.04, 31.24] },
      { px: [1430, 593] }, { px: [1405, 612] } // Sidney, Melbourne (haritada Avustralya kaydırılmış çizilmiş)
    ];
    CITIES.forEach(function (c) { c.img = c.px || geo(c.ll[0], c.ll[1]); c.phase = Math.random(); });
    var HOME = CITIES.filter(function (c) { return c.home; });
    var AWAY = CITIES.filter(function (c) { return !c.home; });

    var nat = { w: CAL.w, h: CAL.h };
    var probe = new Image();
    probe.onload = function () { nat.w = probe.naturalWidth || CAL.w; nat.h = probe.naturalHeight || CAL.h; layout(); };
    probe.src = m[1];

    var size = { w: 0, h: 0, ctx: null };
    function layout() {
      size = fitCanvas(cv);
      var s = Math.max(size.w / nat.w, size.h / nat.h);
      var ox = (size.w - nat.w * s) / 2;
      var fx = nat.w / CAL.w, fy = nat.h / CAL.h;
      CITIES.forEach(function (c) { c.x = ox + c.img[0] * fx * s; c.y = c.img[1] * fy * s; });
    }
    layout();
    window.addEventListener('resize', debounce(layout, 150));

    var arcs = [], bursts = [], spawnIn = 600;
    function spawn() {
      var a, b, tries = 0;
      do {
        if (Math.random() < .72) { a = pick(HOME); b = pick(AWAY); } else { a = pick(AWAY); b = pick(AWAY); }
        if (Math.random() < .3) { var tmp = a; a = b; b = tmp; }
        tries++;
      } while ((a === b || Math.abs(a.x - b.x) < size.w * .16) && tries < 12);
      if (a === b) return;
      var apex = rand(.05, .17) * size.h;                // tepe noktası üst bantta → menünün üstünden görünür
      arcs.push({
        a: a, b: b, p: 0, dur: rand(2400, 3400),
        cx: (a.x + b.x) / 2, cy: (4 * apex - a.y - b.y) / 2
      });
    }
    function q(arc, t) {
      var u = 1 - t;
      return [u * u * arc.a.x + 2 * u * t * arc.cx + t * t * arc.b.x,
              u * u * arc.a.y + 2 * u * t * arc.cy + t * t * arc.b.y];
    }

    runWhileVisible(top, function (dt, now) {
      var ctx = size.ctx;
      if (!ctx) return;
      ctx.clearRect(0, 0, size.w, size.h);

      // Şehir noktaları (nabız halkası)
      for (var i = 0; i < CITIES.length; i++) {
        var c = CITIES[i];
        var f = (now / 3200 + c.phase) % 1;
        var col = c.home ? '255,224,138' : '235,250,255';
        ctx.beginPath(); ctx.arc(c.x, c.y, 2 + f * 11, 0, 6.283);
        ctx.strokeStyle = 'rgba(' + col + ',' + (0.45 * (1 - f)).toFixed(3) + ')';
        ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(c.x, c.y, c.home ? 2.6 : 1.8, 0, 6.283);
        ctx.fillStyle = 'rgba(' + col + ',.85)'; ctx.fill();
      }

      // Işık yayları
      spawnIn -= dt;
      if (spawnIn <= 0 && arcs.length < 5) { spawn(); spawnIn = rand(700, 1300); }
      for (var k = arcs.length - 1; k >= 0; k--) {
        var arc = arcs[k];
        var before = arc.p;
        arc.p += dt / arc.dur;
        if (before < 1 && arc.p >= 1) bursts.push({ x: arc.b.x, y: arc.b.y, p: 0 });
        if (arc.p >= 1.4) { arcs.splice(k, 1); continue; }
        var head = easeInOut(Math.min(arc.p, 1));
        var tail = easeInOut(clamp(arc.p - .4, 0, 1));
        var N = 26, prev = q(arc, tail);
        ctx.lineCap = 'round';
        for (var s = 1; s <= N; s++) {
          var tt = tail + (head - tail) * s / N;
          var pt = q(arc, tt);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]);
          ctx.strokeStyle = 'rgba(255,232,160,' + (0.85 * s / N).toFixed(3) + ')';
          ctx.lineWidth = 0.6 + 1.4 * s / N;
          ctx.stroke();
          prev = pt;
        }
        if (arc.p < 1) {
          var h = q(arc, head);
          ctx.beginPath(); ctx.arc(h[0], h[1], 6, 0, 6.283); ctx.fillStyle = 'rgba(255,232,160,.18)'; ctx.fill();
          ctx.beginPath(); ctx.arc(h[0], h[1], 2.2, 0, 6.283); ctx.fillStyle = 'rgba(255,250,230,.95)'; ctx.fill();
        }
      }

      // Varış patlamaları
      for (var b = bursts.length - 1; b >= 0; b--) {
        var bu = bursts[b];
        bu.p += dt / 900;
        if (bu.p >= 1) { bursts.splice(b, 1); continue; }
        ctx.beginPath(); ctx.arc(bu.x, bu.y, 3 + bu.p * 20, 0, 6.283);
        ctx.strokeStyle = 'rgba(255,232,160,' + (0.7 * (1 - bu.p)).toFixed(3) + ')';
        ctx.lineWidth = 1.5; ctx.stroke();
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* 2a. SLOGAN — kelime kelime açılış + altın parıltı                    */
  /* ------------------------------------------------------------------ */
  safe('title', function () {
    var tEl = $('.top > .title');
    if (!tEl || tEl.children.length) return;
    var text = tEl.textContent.trim();
    if (!text) return;
    tEl.setAttribute('dir', 'auto');        // Latin/İngilizce dillerde kelime sırası bozulmasın
    tEl.setAttribute('aria-label', text);
    tEl.textContent = '';
    var words = text.split(/\s+/);
    words.forEach(function (w, i) {
      var outer = el('span', 'ew-word', { 'aria-hidden': 'true' });
      var inner = el('span', 'ew-word-txt');
      outer.style.setProperty('--i', i);
      inner.style.setProperty('--i', i);
      inner.textContent = w;
      outer.appendChild(inner);
      tEl.appendChild(outer);
      if (i < words.length - 1) tEl.appendChild(doc.createTextNode(' '));
    });
    if (MOTION) {
      setTimeout(function () {
        $$('.ew-word-txt', tEl).forEach(function (n) { n.classList.add('ew-shine'); });
      }, 250 + words.length * 150 + 1100);
    }
  });

  /* ------------------------------------------------------------------ */
  /* 2b. HİCRİ AY EVRESİ — tarihin yanında bugünkü ayın şekli             */
  /* ------------------------------------------------------------------ */
  safe('moon', function () {
    if (typeof window.UQCal !== 'function') return;
    var ar = $('.chisla-ar');
    if (!ar) return;
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var H = new window.UQCal(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())).convert();
    var day = parseInt(H && H.Hday, 10);
    if (!day) return;

    var p = clamp((day - .5) / 29.53, 0, 1);          // 0 = yeni ay, .5 = dolunay
    var k = Math.cos(2 * Math.PI * p);
    var r = 11, rx = (Math.abs(k) * r).toFixed(2);
    var waxing = p < .5;
    var outer = waxing ? 1 : 0;
    var term = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    var lit = 'M14 3 A11 11 0 0 ' + outer + ' 14 25 A' + rx + ' 11 0 0 ' + term + ' 14 3 Z';

    var wrapM = el('span', 'tw:inline-flex tw:shrink-0 tw:items-center tw:motion-safe:animate-ew-pulse-soft', { 'aria-hidden': 'true' });
    wrapM.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 28 28">' +
      '<circle cx="14" cy="14" r="11" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<path d="' + lit + '" fill="#ffe9a8"/></svg>';
    ar.parentNode.insertBefore(wrapM, ar);
  });

  /* ------------------------------------------------------------------ */
  /* 3. YARIM DAİRE MENÜ                                                 */
  /* ------------------------------------------------------------------ */
  safe('menu', function () {
    var menu = $('.menu');
    var img = menu && $('img', menu);
    if (!img) return;
    var btns = $$('.mbtn', menu);
    if (!btns.length) return;

    // 3a. Her daireye kendi görsel diliminin kopyası → hover'da ikon "dışarı fırlar"
    btns.forEach(function (b) {
      var s = el('span', 'ew-slice', { 'aria-hidden': 'true' });
      b.insertBefore(s, b.firstChild);
      b._ewSlice = s;
    });
    function layoutSlices() {
      var W = img.clientWidth, H = img.clientHeight;
      if (!W || !H) return;
      var src = img.currentSrc || img.src;
      btns.forEach(function (b) {
        var s = b._ewSlice;
        s.style.backgroundImage = 'url("' + src + '")';
        s.style.backgroundSize = W + 'px ' + H + 'px';
        s.style.backgroundPosition = (-b.offsetLeft) + 'px ' + (-b.offsetTop) + 'px';
      });
    }
    window.addEventListener('resize', debounce(layoutSlices, 150));

    // 3b. Tooltip baloncuğu
    var tip = el('div',
      'tw:absolute tw:z-10 tw:pointer-events-none tw:whitespace-nowrap tw:rounded-full tw:bg-white tw:px-4 tw:py-1.5 ' +
      'tw:text-[15px] tw:font-bold tw:text-ew-deep tw:shadow-[0_10px_30px_rgba(0,0,0,.3)] ' +
      'tw:opacity-0 tw:transition tw:duration-200 tw:ease-out tw:flex tw:items-center tw:gap-1.5',
      { role: 'tooltip', dir: 'auto' });
    var tipText = el('span');
    var tipIcon = el('span', 'tw:inline-flex tw:opacity-60');
    tipIcon.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';
    var tipArrow = el('span', 'tw:absolute tw:left-1/2 tw:top-full tw:-translate-x-1/2 tw:border-[7px] tw:border-transparent tw:border-t-white');
    tip.appendChild(tipText); tip.appendChild(tipIcon); tip.appendChild(tipArrow);
    tip.style.transform = 'translate(-50%, calc(-100% + 8px))';
    menu.appendChild(tip);

    function label(b) {
      var a = $('a', b);
      if (!a) return null;
      return a.textContent.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    }
    function showTip(b) {
      var txt = label(b);
      var inactive = !txt;
      tipText.textContent = inactive ? t('soon') : txt;
      tipIcon.style.display = inactive ? 'none' : '';
      tip.style.left = (b.offsetLeft + b.offsetWidth / 2) + 'px';
      tip.style.top = (b.offsetTop - 18) + 'px';     // büyüyen dairenin (scale 1.17) üstünde kalsın
      tip.classList.remove('tw:opacity-0');
      tip.style.transform = 'translate(-50%, -100%)';
    }
    function hideTip() {
      tip.classList.add('tw:opacity-0');
      tip.style.transform = 'translate(-50%, calc(-100% + 8px))';
    }
    btns.forEach(function (b) {
      b.addEventListener('mouseenter', function () { showTip(b); });
      b.addEventListener('mouseleave', hideTip);
      b.addEventListener('focusin', function () { showTip(b); });
      b.addEventListener('focusout', hideTip);
    });

    // Geometri: menü merkezi görselin alt-ortası; açı 0° = yukarı, +90° = sağ
    function angles() {
      var W = img.clientWidth, H = img.clientHeight;
      return btns.map(function (b) {
        var x = b.offsetLeft + b.offsetWidth / 2, y = b.offsetTop + b.offsetHeight / 2;
        return Math.atan2(x - W / 2, H - y) * 180 / Math.PI;
      });
    }
    function ping(b) {
      b.classList.add('ew-ping');
      setTimeout(function () { b.classList.remove('ew-ping'); }, 650);
    }

    // 3c. Okuyan çocuğun arkasında dönen ışık huzmeleri + merkezden tarama ışını
    var ratio = (img.naturalHeight && img.naturalWidth) ? img.naturalHeight / img.naturalWidth : 701 / 1409;
    var HOLE = .2786;                                   // iç boşluk yarıçapı / menü genişliği
    var haloWrap = el('div',
      'tw:absolute tw:z-[1] tw:pointer-events-none tw:left-1/2 tw:top-[77%] tw:w-[30%] tw:aspect-square ' +
      'tw:-translate-x-1/2 tw:-translate-y-1/2 tw:opacity-0 tw:transition-opacity tw:duration-[1500ms]',
      { 'aria-hidden': 'true' });
    var halo = el('div', 'ew-halo tw:size-full tw:rounded-full tw:motion-safe:animate-ew-spin-slow');
    haloWrap.appendChild(halo);
    menu.insertBefore(haloWrap, img);

    var beamWrap = el('div', 'tw:absolute tw:z-[1] tw:pointer-events-none tw:overflow-hidden', { 'aria-hidden': 'true' });
    beamWrap.style.left = ((.5 - HOLE) * 100) + '%';
    beamWrap.style.width = (HOLE * 200) + '%';
    beamWrap.style.top = ((1 - HOLE / ratio) * 100) + '%';
    beamWrap.style.height = ((HOLE / ratio) * 100) + '%';
    var beam = el('div', 'ew-beam tw:absolute tw:left-0 tw:top-0 tw:w-full tw:aspect-square tw:rounded-full');
    beamWrap.appendChild(beam);
    menu.insertBefore(beamWrap, img);

    var SWEEP = 2200;
    function sweep() {
      if (doc.hidden) return;
      beam.classList.remove('ew-sweeping');
      void beam.offsetWidth;
      beam.classList.add('ew-sweeping');
      angles().forEach(function (phi, i) {
        setTimeout(function () { ping(btns[i]); }, clamp((90 - phi) / 180, 0, 1) * SWEEP);
      });
    }

    function afterIntro() {
      haloWrap.classList.remove('tw:opacity-0');
      haloWrap.classList.add('tw:opacity-80');
      if (!MOTION) return;
      setTimeout(sweep, 500);
      setInterval(sweep, 8500);
    }

    // 3d. Yelpaze açılışı (sağdan sola, RTL yönünde)
    function intro() {
      layoutSlices();
      if (!MOTION) { afterIntro(); return; }
      var angs = angles(), done = btns.map(function () { return false; });
      var t0 = performance.now(), D = 1500;
      requestAnimationFrame(function step(now) {
        var p = Math.min(1, (now - t0) / D);
        var e = 1 - Math.pow(1 - p, 3);
        img.style.setProperty('--ew-fan', (e * 186).toFixed(2) + 'deg');
        var front = 90 - e * 180;                       // yelpaze kenarının açısı
        angs.forEach(function (a, i) { if (!done[i] && a >= front) { done[i] = true; ping(btns[i]); } });
        if (p < 1) requestAnimationFrame(step);
        else {
          img.classList.remove('ew-fan');
          img.style.removeProperty('--ew-fan');
          afterIntro();
        }
      });
    }

    if (MOTION) img.classList.add('ew-fan');
    if (img.complete && img.naturalWidth) intro();
    else {
      img.addEventListener('load', intro, { once: true });
      img.addEventListener('error', function () { img.classList.remove('ew-fan'); }, { once: true });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 3e. İmleç: harita paralaksı + menünün 3D eğimi                     */
  /* ------------------------------------------------------------------ */
  safe('pointer', function () {
    if (!(MOTION && FINE)) return;
    var top = $('.top');
    if (!top) return;
    var layer = $('.ew-hero-layer', top), menu = $('.menu', top);
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function step() {
      raf = 0;
      cx += (tx - cx) * .07; cy += (ty - cy) * .07;
      var settled = Math.abs(tx - cx) < .0008 && Math.abs(ty - cy) < .0008;
      if (layer) layer.style.transform = 'translate3d(' + (-cx * 18).toFixed(2) + 'px,' + (-cy * 12).toFixed(2) + 'px,0)';
      if (menu) {
        if (settled && !tx && !ty) menu.style.transform = '';   // dinlenirken keskin görüntü
        else menu.style.transform = 'perspective(1600px) rotateX(' + (-cy * 5).toFixed(3) + 'deg) rotateY(' + (cx * 6).toFixed(3) + 'deg)';
      }
      if (!settled) kick();
    }
    top.addEventListener('mousemove', function (e) {
      var r = top.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5;
      ty = (e.clientY - r.top) / r.height - .5;
      kick();
    });
    top.addEventListener('mouseleave', function () { tx = 0; ty = 0; kick(); });
  });

  /* ------------------------------------------------------------------ */
  /* 4. Hero → Uygulamalar arası akan dalgalar                           */
  /* ------------------------------------------------------------------ */
  safe('waves', function () {
    var top = $('.top');
    if (!top || !top.parentNode) return;
    function path(a, base, ph) {
      var d = 'M0 0 L2880 0';
      for (var x = 2880; x >= 0; x -= 40) d += ' L' + x + ' ' + (base + a * Math.sin(2 * Math.PI * x / 720 + ph)).toFixed(1);
      return d + ' Z';
    }
    var holder = el('div', 'tw:relative tw:h-0 tw:pointer-events-none', { 'aria-hidden': 'true' });
    var box = el('div', 'tw:absolute tw:inset-x-0 tw:top-0 tw:h-[46px] tw:overflow-hidden');
    [
      { a: 7, b: 26, ph: 0,   fill: 'rgba(12,72,92,.30)',   cls: 'tw:motion-safe:animate-ew-wave-a' },
      { a: 6, b: 18, ph: 1.7, fill: 'rgba(12,72,92,.22)',   cls: 'tw:motion-safe:animate-ew-wave-b' },
      { a: 5, b: 11, ph: 3.1, fill: 'rgba(255,255,255,.10)', cls: 'tw:motion-safe:animate-ew-wave-c' }
    ].forEach(function (w) {
      var wrap = el('div', 'tw:absolute tw:left-0 tw:top-0 tw:h-full tw:w-[200%] ' + w.cls);
      wrap.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 2880 46" preserveAspectRatio="none">' +
        '<path d="' + path(w.a, w.b, w.ph) + '" fill="' + w.fill + '"/></svg>';
      box.appendChild(wrap);
    });
    holder.appendChild(box);
    top.parentNode.insertBefore(holder, top.nextSibling);
  });

  /* ------------------------------------------------------------------ */
  /* 5. UYGULAMALAR — beliriş, süzülme, 3D eğim, parlama, dalga, harfler  */
  /* ------------------------------------------------------------------ */
  safe('apps', function () {
    var apps = $('.apps');
    if (!apps) return;
    var items = $$('.item', apps);

    items.forEach(function (it, i) {
      it.style.setProperty('--i', i);
      var icon = $('.icon', it), img = icon && $('img', icon);
      if (!img) return;

      // Görsel + parlama katmanı aynı kapta süzülsün diye sarmalanır
      var floater = el('span', 'ew-floater tw:relative tw:block');
      icon.insertBefore(floater, img);
      floater.appendChild(img);

      var mask = el('span', 'ew-iconmask tw:absolute tw:inset-0 tw:pointer-events-none tw:overflow-hidden', { 'aria-hidden': 'true' });
      mask.style.setProperty('--ew-mask', 'url("' + (img.currentSrc || img.src) + '")');
      var glare = el('span', 'ew-glare tw:absolute tw:inset-0 tw:opacity-0 tw:transition-opacity tw:duration-300 tw:group-hover:opacity-100');
      mask.appendChild(glare);
      floater.appendChild(mask);
      icon.classList.add('tw:group');

      if (FINE) {
        if (MOTION) icon.classList.add('ew-tilt');
        icon.addEventListener('mousemove', function (e) {
          var r = icon.getBoundingClientRect();
          var px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1);
          icon.style.setProperty('--ry', ((px - .5) * 24).toFixed(2) + 'deg');
          icon.style.setProperty('--rx', ((.5 - py) * 24).toFixed(2) + 'deg');
          icon.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          icon.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        });
        icon.addEventListener('mouseleave', function () {
          icon.style.setProperty('--rx', '0deg');
          icon.style.setProperty('--ry', '0deg');
        });
      }

      if (MOTION) {
        it.addEventListener('pointerdown', function (e) {
          var r = mask.getBoundingClientRect();
          var dot = el('span', 'tw:absolute tw:size-5 tw:-ml-2.5 tw:-mt-2.5 tw:rounded-full tw:bg-white/70 tw:animate-ew-ripple');
          dot.style.left = (e.clientX - r.left) + 'px';
          dot.style.top = (e.clientY - r.top) + 'px';
          mask.appendChild(dot);
          setTimeout(function () { dot.remove(); }, 800);
        });
      }
    });

    if (!MOTION) return;
    revealOnScroll(items, .15);

    // Arka planda yükselen Uygur harfleri — "harfler nesilden nesile"
    var LETTERS = 'ئا ئە ب پ ت ج چ خ د ر ز ژ س ش غ ف ق ك گ ڭ ل م ن ھ ئو ئۇ ئۆ ئۈ ۋ ئې ئى ي'.split(' ');
    var cv = el('canvas', 'tw:absolute tw:inset-0 tw:size-full tw:pointer-events-none', { 'aria-hidden': 'true' });
    apps.insertBefore(cv, apps.firstChild);
    var size = fitCanvas(cv), parts = [];

    function make(anyY) {
      return {
        ch: pick(LETTERS), x: rand(0, size.w), y: anyY ? rand(0, size.h) : size.h + rand(10, 60),
        s: rand(16, 44), v: rand(9, 22), a: rand(.05, .16), ph: rand(0, 6.28), rot: rand(-.3, .3), vr: rand(-.08, .08)
      };
    }
    function populate() {
      size = fitCanvas(cv);
      var n = clamp(Math.round(size.w * size.h / 11000), 10, 36);
      while (parts.length < n) parts.push(make(true));
      parts.length = n;
    }
    populate();
    window.addEventListener('resize', debounce(populate, 200));

    runWhileVisible(apps, function (dt, now) {
      var ctx = size.ctx, w = size.w, h = size.h;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.v * dt / 1000;
        p.rot += p.vr * dt / 1000;
        if (p.y < -p.s) { parts[i] = p = make(false); }
        var x = p.x + Math.sin(now / 1600 + p.ph) * 10;
        var edge = clamp(Math.min(p.y, h - p.y) / 50, 0, 1);
        ctx.globalAlpha = p.a * edge;
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        ctx.font = p.s.toFixed(0) + "px UKIJ, uyghur, 'Noto Naskh Arabic', sans-serif";
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
  });

  /* ------------------------------------------------------------------ */
  /* 6. MODAL — yükleniyor animasyonu                                    */
  /* ------------------------------------------------------------------ */
  safe('modal', function () {
    var modal = $('#appMpdal'), frame = $('#myframe');
    var body = modal && $('.modal-body', modal);
    if (!frame || !body) return;

    var loader = el('div',
      'tw:absolute tw:inset-0 tw:z-10 tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-4 ' +
      'tw:bg-white tw:text-ew-deep tw:transition-opacity tw:duration-300 tw:opacity-0 tw:pointer-events-none',
      { 'aria-live': 'polite' });
    var spinner = el('div', 'tw:size-12 tw:rounded-full tw:border-4 tw:border-ew-teal/25 tw:border-t-ew-teal tw:motion-safe:animate-ew-spin');
    var txt = el('div', 'tw:text-base');
    txt.textContent = t('loading');
    loader.appendChild(spinner);
    loader.appendChild(txt);
    body.appendChild(loader);

    var timer;
    function show() {
      loader.classList.remove('tw:opacity-0', 'tw:pointer-events-none');
      clearTimeout(timer);
      timer = setTimeout(hide, 10000);
    }
    function hide() {
      clearTimeout(timer);
      loader.classList.add('tw:opacity-0', 'tw:pointer-events-none');
    }
    frame.addEventListener('load', function () { if (frame.getAttribute('src')) hide(); });
    modal.addEventListener('show.bs.modal', show);
    modal.addEventListener('hidden.bs.modal', hide);
  });

  /* ------------------------------------------------------------------ */
  /* 7. FOOTER — sosyal ikonlar: sırayla beliriş + manyetik hover        */
  /* ------------------------------------------------------------------ */
  safe('social', function () {
    var icons = $$('.footer-social .social-icon');
    icons.forEach(function (a, i) {
      a.style.setProperty('--i', i);
      a.addEventListener('animationend', function () { a.classList.add('ew-done'); });
      if (!(MOTION && FINE)) return;
      var cx = 0, cy = 0;
      a.addEventListener('mouseenter', function () {
        a.style.transform = '';
        var r = a.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      });
      a.addEventListener('mousemove', function (e) {
        a.style.transform = 'translate(' + ((e.clientX - cx) * .4).toFixed(1) + 'px,' + ((e.clientY - cy) * .4).toFixed(1) + 'px) scale(1.18)';
      });
      a.addEventListener('mouseleave', function () { a.style.transform = ''; });
    });
    if (MOTION) revealOnScroll(icons, .3);
  });
})();
